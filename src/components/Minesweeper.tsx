'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Cell from './Cell'
import { 
  Difficulty, 
  GameStatus, 
  DIFFICULTY_CONFIGS 
} from '../types/game'
import {
  createBoard,
  placeMinesAfterFirstClick,
  revealCell,
  toggleFlag,
  checkWinCondition,
  revealAllMines,
} from '../utils/gameLogic'
import { MinesweeperAISolver, AIMove } from '../utils/aiSolver_fixed'
import type { Cell as CellType } from '../types/game'

const Minesweeper: React.FC = () => {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [board, setBoard] = useState<CellType[][]>([])
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing')
  const [flagCount, setFlagCount] = useState(0)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [gameStarted, setGameStarted] = useState(false)
  const [minesPlaced, setMinesPlaced] = useState(false) // NEW: Track if mines are placed
  
  // AI Solver state
  const [aiSolver, setAiSolver] = useState<MinesweeperAISolver | null>(null)
  const [isAiRunning, setIsAiRunning] = useState(false)
  const [aiSpeed, setAiSpeed] = useState(500) // milliseconds between moves
  const [aiMoves, setAiMoves] = useState<AIMove[]>([])
  const [lastAiMove, setLastAiMove] = useState<AIMove | null>(null)
  const [aiStats, setAiStats] = useState({
    totalMoves: 0,
    certainMoves: 0,
    probabilisticMoves: 0,
    success: false
  })

  const config = DIFFICULTY_CONFIGS[difficulty]

  const initializeGame = useCallback(() => {
    const newBoard = createBoard(config)
    setBoard(newBoard)
    setGameStatus('playing')
    setFlagCount(0)
    setTimeElapsed(0)
    setGameStarted(false)
    setMinesPlaced(false) // NEW: Reset mines placed flag
    
    // Reset AI state
    setAiSolver(null)
    setIsAiRunning(false)
    setAiMoves([])
    setLastAiMove(null)
    setAiStats({
      totalMoves: 0,
      certainMoves: 0,
      probabilisticMoves: 0,
      success: false
    })
  }, [config])

  useEffect(() => {
    initializeGame()
  }, [initializeGame])

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null
    
    if (gameStarted && gameStatus === 'playing') {
      interval = setInterval(() => {
        setTimeElapsed(time => time + 1)
      }, 1000)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [gameStarted, gameStatus])

  const handleCellClick = async (row: number, col: number, isAiMove?: boolean) => {
    if (gameStatus !== 'playing' || board[row][col].isFlagged) {
      return
    }

    if (!gameStarted) {
      setGameStarted(true)
    }

    // YENI: İlk tıklama ise mayınları şimdi yerleştir
    let currentBoard = board
    if (!minesPlaced) {
      console.log(`İlk tıklama: (${row}, ${col}) - Mayınlar yerleştiriliyor...`)
      currentBoard = placeMinesAfterFirstClick(board, config, row, col)
      setBoard(currentBoard)
      setMinesPlaced(true)
    }

    const cell = currentBoard[row][col]
    
    // Veri toplama: Hamle sonucunu backend'e gönder
    if (aiSolver) {
      const label = cell.isMine ? 1 : 0 // 1 if mine, 0 if safe
      await aiSolver.logResult(row, col, label)
    }
    
    // Artık ilk tıklama her zaman güvenli olacak
    if (cell.isMine) {
      const revealedBoard = revealAllMines(currentBoard)
      setBoard(revealedBoard)
      setGameStatus('lost')
      
      if (isAiMove) {
        setIsAiRunning(false)
        setAiStats(prev => ({ ...prev, success: false }))
      }
      
      // Oyun bittiğinde modeli eğit
      if (aiSolver) {
        await aiSolver.trainModel()
      }
      return
    }

    const newBoard = revealCell(currentBoard, row, col)
    setBoard(newBoard)

    if (checkWinCondition(newBoard, config.mines)) {
      setGameStatus('won')
      
      if (isAiMove) {
        setIsAiRunning(false)
        setAiStats(prev => ({ ...prev, success: true }))
      }
      
      // Oyun kazanıldığında da modeli eğit
      if (aiSolver) {
        await aiSolver.trainModel()
      }
    }
  }

  const handleCellRightClick = (e: React.MouseEvent, row: number, col: number, isAiMove?: boolean) => {
    e.preventDefault()
    
    if (gameStatus !== 'playing' || board[row][col].isRevealed) {
      return
    }

    if (!gameStarted) {
      setGameStarted(true)
    }

    const cell = board[row][col]
    const newBoard = toggleFlag(board, row, col)
    setBoard(newBoard)

    if (cell.isFlagged) {
      setFlagCount(flagCount - 1)
    } else {
      setFlagCount(flagCount + 1)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // AI Control Functions
  const startAiSolver = () => {
    if (gameStatus === 'playing' && aiSolver && minesPlaced) {
      setIsAiRunning(true)
    } else if (!minesPlaced) {
      alert('Önce bir hücreye tıklayın! Mayınlar henüz yerleştirilmedi.')
    }
  }

  const stopAiSolver = () => {
    setIsAiRunning(false)
  }

  const stepAiSolver = async () => {
    if (gameStatus === 'playing' && aiSolver && minesPlaced) {
      const move = await aiSolver.getNextMove()
      if (move) {
        setLastAiMove(move)
        setAiMoves(prev => [...prev, move])
        
        setAiStats(prev => ({
          ...prev,
          totalMoves: prev.totalMoves + 1,
          certainMoves: prev.certainMoves + (move.confidence >= 0.9 ? 1 : 0),
          probabilisticMoves: prev.probabilisticMoves + (move.confidence < 0.9 ? 1 : 0)
        }))

        if (move.action === 'reveal') {
          await handleCellClick(move.row, move.col, true)
        } else if (move.action === 'flag') {
          handleCellRightClick(new MouseEvent('contextmenu') as any, move.row, move.col, true)
        }
      }
    }
  }

  const getStatusEmoji = () => {
    switch (gameStatus) {
      case 'won': return '😎'
      case 'lost': return '😵'
      default: return '🙂'
    }
  }

  const minesRemaining = config.mines - flagCount

  // Initialize AI solver when board changes AND mines are placed
  useEffect(() => {
    if (board.length > 0 && minesPlaced) {
      const solver = new MinesweeperAISolver(board, config.mines)
      setAiSolver(solver)
    }
  }, [board, config.mines, minesPlaced])

  // AI move execution
  useEffect(() => {
    if (!isAiRunning || !aiSolver || gameStatus !== 'playing' || !minesPlaced) {
      return
    }

    const executeAiMove = async () => {
      const move = await aiSolver.getNextMove()
      
      if (!move) {
        setIsAiRunning(false)
        return
      }

      setLastAiMove(move)
      setAiMoves(prev => [...prev, move])
      
      // Update AI stats
      setAiStats(prev => ({
        ...prev,
        totalMoves: prev.totalMoves + 1,
        certainMoves: prev.certainMoves + (move.confidence >= 0.9 ? 1 : 0),
        probabilisticMoves: prev.probabilisticMoves + (move.confidence < 0.9 ? 1 : 0)
      }))

      // Execute the move
      if (move.action === 'reveal') {
        await handleCellClick(move.row, move.col, true) // true indicates AI move
      } else if (move.action === 'flag') {
        handleCellRightClick(new MouseEvent('contextmenu') as any, move.row, move.col, true)
      }
    }

    const timer = setTimeout(executeAiMove, aiSpeed)
    return () => clearTimeout(timer)
  }, [isAiRunning, aiSolver, gameStatus, aiSpeed, board, minesPlaced])

  // Update AI solver when board changes
  useEffect(() => {
    if (aiSolver && board.length > 0 && minesPlaced) {
      aiSolver.updateBoard(board)
    }
  }, [aiSolver, board, minesPlaced])

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Difficulty Selector */}
      <div className="flex space-x-2">
        {(Object.keys(DIFFICULTY_CONFIGS) as Difficulty[]).map((diff) => (
          <button
            key={diff}
            onClick={() => setDifficulty(diff)}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              difficulty === diff
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {diff.charAt(0).toUpperCase() + diff.slice(1)}
          </button>
        ))}
      </div>

      {/* Game Stats */}
      <div className="flex items-center space-x-8 text-lg font-mono">
        <div className="flex items-center space-x-2">
          <span>💣</span>
          <span className="min-w-[3ch] text-right">
            {minesRemaining.toString().padStart(3, '0')}
          </span>
        </div>
        
        <button
          onClick={initializeGame}
          className="text-3xl hover:scale-110 transition-transform"
        >
          {getStatusEmoji()}
        </button>
        
        <div className="flex items-center space-x-2">
          <span>⏱️</span>
          <span className="min-w-[5ch] text-right">
            {formatTime(timeElapsed)}
          </span>
        </div>
      </div>

      {/* AI Controls */}
      <div className="bg-gray-100 p-4 rounded-lg w-full max-w-2xl">
        <h3 className="text-lg font-semibold mb-3 text-center">AI Solver</h3>
        
        {/* AI Control Buttons */}
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          <button
            onClick={startAiSolver}
            disabled={isAiRunning || gameStatus !== 'playing' || !minesPlaced}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isAiRunning ? '🤖 Running...' : !minesPlaced ? '⚠️ First Click Required' : '▶️ Start AI'}
          </button>
          
          <button
            onClick={stopAiSolver}
            disabled={!isAiRunning}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            ⏹️ Stop AI
          </button>
          
          <button
            onClick={stepAiSolver}
            disabled={isAiRunning || gameStatus !== 'playing' || !minesPlaced}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            ⏭️ Step
          </button>
        </div>

        {/* AI Speed Control */}
        <div className="flex items-center justify-center space-x-3 mb-4">
          <label className="text-sm font-medium">Speed:</label>
          <input
            type="range"
            min="100"
            max="2000"
            step="100"
            value={aiSpeed}
            onChange={(e) => setAiSpeed(Number(e.target.value))}
            className="w-24"
          />
          <span className="text-sm text-gray-600 min-w-[4ch]">{aiSpeed}ms</span>
        </div>

        {/* AI Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="font-semibold text-blue-600">{aiStats.totalMoves}</div>
            <div className="text-gray-600">Total Moves</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-green-600">{aiStats.certainMoves}</div>
            <div className="text-gray-600">Certain</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-orange-600">{aiStats.probabilisticMoves}</div>
            <div className="text-gray-600">Guesses</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-purple-600">
              {aiSolver ? `${aiSolver.getCompletionPercentage().toFixed(1)}%` : '0%'}
            </div>
            <div className="text-gray-600">Complete</div>
          </div>
        </div>

        {/* Last AI Move Info */}
        {lastAiMove && (
          <div className="mt-4 p-3 bg-white rounded border text-sm">
            <div className="font-medium">Last AI Move:</div>
            <div className="text-gray-600">
              {lastAiMove.action.toUpperCase()} cell ({lastAiMove.row}, {lastAiMove.col}) - 
              Confidence: {(lastAiMove.confidence * 100).toFixed(1)}%
              {lastAiMove.reasoning && <div className="mt-1 italic">Reason: {lastAiMove.reasoning}</div>}
            </div>
          </div>
        )}
      </div>

      {/* Game Board */}
      <div 
        className="inline-grid gap-0 border-2 border-gray-400 bg-gray-400"
        style={{
          gridTemplateColumns: `repeat(${config.cols}, 1fr)`,
        }}
      >
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const isLastMove = lastAiMove ? lastAiMove.row === rowIndex && lastAiMove.col === colIndex : false
            const isAiMove = aiMoves.some(move => move.row === rowIndex && move.col === colIndex)
            
            return (
              <Cell
                key={`${rowIndex}-${colIndex}`}
                cell={cell}
                onClick={() => handleCellClick(rowIndex, colIndex)}
                onRightClick={(e) => handleCellRightClick(e, rowIndex, colIndex)}
                isAiLastMove={isLastMove}
                isAiMove={isAiMove && !isLastMove}
              />
            )
          })
        )}
      </div>

      {/* Game Status */}
      {gameStatus !== 'playing' && (
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">
            {gameStatus === 'won' ? '🎉 You Won!' : '💥 Game Over!'}
          </div>
          <div className="text-gray-600">
            Time: {formatTime(timeElapsed)}
          </div>
          <button
            onClick={initializeGame}
            className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            New Game
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="text-sm text-gray-600 text-center max-w-md">
        <p className="mb-2">
          <strong>Left click</strong> to reveal a cell
        </p>
        <p>
          <strong>Right click</strong> to flag/unflag a cell
        </p>
      </div>
    </div>
  )
}

export default Minesweeper
