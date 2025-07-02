'use client'

import React from 'react'
import { Cell as CellType } from '../types/game'

interface CellProps {
  cell: CellType
  onClick: () => void
  onRightClick: (e: React.MouseEvent) => void
  isAiLastMove?: boolean
  isAiMove?: boolean
}

const Cell: React.FC<CellProps> = ({ cell, onClick, onRightClick, isAiLastMove, isAiMove }) => {
  const getCellContent = () => {
    if (cell.isFlagged) {
      return '🚩'
    }
    
    if (!cell.isRevealed) {
      return ''
    }
    
    if (cell.isMine) {
      return '💣'
    }
    
    if (cell.neighborCount > 0) {
      return cell.neighborCount.toString()
    }
    
    return ''
  }

  const getCellClasses = () => {
    let classes = 'cell '
    
    if (cell.isRevealed) {
      classes += 'revealed '
      if (cell.isMine) {
        classes += 'mine '
      } else if (cell.neighborCount > 0) {
        classes += `number-${cell.neighborCount} `
      }
    } else if (cell.isFlagged) {
      classes += 'flagged '
    } else {
      classes += 'bg-gray-300 hover:bg-gray-200 '
    }
    
    // Add AI highlighting
    if (isAiLastMove) {
      classes += 'ai-last-move '
    } else if (isAiMove) {
      classes += 'ai-move '
    }
    
    return classes
  }

  return (
    <button
      className={getCellClasses()}
      onClick={onClick}
      onContextMenu={onRightClick}
      disabled={cell.isRevealed}
    >
      {getCellContent()}
    </button>
  )
}

export default Cell
