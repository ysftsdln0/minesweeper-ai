'use client'

import { useState, useEffect, useCallback } from 'react'
import Minesweeper from '../components/Minesweeper'

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-6 max-w-4xl w-full">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
          🚩 Minesweeper AI
        </h1>
        <Minesweeper />
      </div>
    </div>
  )
}
