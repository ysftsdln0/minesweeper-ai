import { Cell, GameConfig } from '../types/game'

export function createBoard(config: GameConfig): Cell[][] {
  const { rows, cols } = config
  const board: Cell[][] = []

  // Initialize empty board - NO MINES YET!
  for (let row = 0; row < rows; row++) {
    board[row] = []
    for (let col = 0; col < cols; col++) {
      board[row][col] = {
        isMine: false,
        isRevealed: false,
        isFlagged: false,
        neighborCount: 0,
        row,
        col,
      }
    }
  }

  return board
}

export function placeMinesAfterFirstClick(board: Cell[][], config: GameConfig, firstClickRow: number, firstClickCol: number): Cell[][] {
  const { rows, cols, mines } = config
  const newBoard = board.map(row => row.map(cell => ({ ...cell })))

  // Get all safe positions (first click position + its neighbors)
  const safePositions = new Set<string>()
  
  // Add first click position as safe
  safePositions.add(`${firstClickRow}-${firstClickCol}`)
  
  // Add all neighbors of first click as safe (to ensure a good opening)
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ]

  for (const [dr, dc] of directions) {
    const newRow = firstClickRow + dr
    const newCol = firstClickCol + dc
    
    if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols) {
      safePositions.add(`${newRow}-${newCol}`)
    }
  }

  // Place mines randomly, avoiding safe positions
  const minePositions = new Set<string>()
  while (minePositions.size < mines) {
    const row = Math.floor(Math.random() * rows)
    const col = Math.floor(Math.random() * cols)
    const key = `${row}-${col}`
    
    if (!minePositions.has(key) && !safePositions.has(key)) {
      minePositions.add(key)
      newBoard[row][col].isMine = true
    }
  }

  // Calculate neighbor counts
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (!newBoard[row][col].isMine) {
        newBoard[row][col].neighborCount = countNeighboringMines(newBoard, row, col)
      }
    }
  }

  return newBoard
}

export function countNeighboringMines(board: Cell[][], row: number, col: number): number {
  let count = 0
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ]

  for (const [dr, dc] of directions) {
    const newRow = row + dr
    const newCol = col + dc
    
    if (
      newRow >= 0 && 
      newRow < board.length && 
      newCol >= 0 && 
      newCol < board[0].length &&
      board[newRow][newCol].isMine
    ) {
      count++
    }
  }

  return count
}

export function revealCell(board: Cell[][], row: number, col: number): Cell[][] {
  const newBoard = board.map(row => row.map(cell => ({ ...cell })))
  const cell = newBoard[row][col]

  if (cell.isRevealed || cell.isFlagged) {
    return newBoard
  }

  cell.isRevealed = true

  // If the cell has no neighboring mines, reveal all neighbors
  if (!cell.isMine && cell.neighborCount === 0) {
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ]

    for (const [dr, dc] of directions) {
      const newRow = row + dr
      const newCol = col + dc
      
      if (
        newRow >= 0 && 
        newRow < newBoard.length && 
        newCol >= 0 && 
        newCol < newBoard[0].length
      ) {
        const neighbor = newBoard[newRow][newCol]
        if (!neighbor.isRevealed && !neighbor.isFlagged) {
          const updatedBoard = revealCell(newBoard, newRow, newCol)
          // Copy the updated state back
          for (let i = 0; i < updatedBoard.length; i++) {
            for (let j = 0; j < updatedBoard[i].length; j++) {
              newBoard[i][j] = updatedBoard[i][j]
            }
          }
        }
      }
    }
  }

  return newBoard
}

export function toggleFlag(board: Cell[][], row: number, col: number): Cell[][] {
  const newBoard = board.map(row => row.map(cell => ({ ...cell })))
  const cell = newBoard[row][col]

  if (!cell.isRevealed) {
    cell.isFlagged = !cell.isFlagged
  }

  return newBoard
}

export function checkWinCondition(board: Cell[][], totalMines: number): boolean {
  let revealedCount = 0
  let flaggedMines = 0

  for (const row of board) {
    for (const cell of row) {
      if (cell.isRevealed && !cell.isMine) {
        revealedCount++
      }
      if (cell.isFlagged && cell.isMine) {
        flaggedMines++
      }
    }
  }

  const totalCells = board.length * board[0].length
  const nonMineCells = totalCells - totalMines

  return revealedCount === nonMineCells
}

export function revealAllMines(board: Cell[][]): Cell[][] {
  return board.map(row => 
    row.map(cell => 
      cell.isMine ? { ...cell, isRevealed: true } : cell
    )
  )
}
