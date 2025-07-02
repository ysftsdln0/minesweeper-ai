# Minesweeper AI

A modern Minesweeper game with an intelligent AI solver built with Next.js, React, TypeScript, and Tailwind CSS.

## Features

- 🎮 Interactive Minesweeper game with customizable difficulty levels
- 🤖 Advanced AI solver with multiple solving strategies
- 🎯 Smart pattern recognition and probabilistic analysis
- 💡 Step-by-step AI reasoning display
- 📱 Responsive design with modern UI
- ⚡ Built with Next.js 14 and TypeScript

## AI Solving Strategies

The AI solver implements multiple sophisticated strategies:

1. **Basic Constraint Solving**: Analyzes revealed numbers and their neighbors
2. **Pattern Recognition**: Detects common Minesweeper patterns (1-2-1, etc.)
3. **Probabilistic Analysis**: Calculates mine probabilities for optimal guessing
4. **Smart Opening**: Uses statistically optimal starting positions

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Hooks
- **AI Logic**: Custom TypeScript algorithms

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/minesweeper-ai.git
cd minesweeper-ai
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Manual Play**: Click on cells to reveal them, right-click to flag mines
2. **AI Assistance**: Use the AI solver to get hints or watch it solve automatically
3. **Difficulty Levels**: Choose from Beginner, Intermediate, or Expert modes
4. **Custom Games**: Set your own board size and mine count

## Project Structure

```
src/
├── app/                # Next.js app directory
├── components/         # React components
│   ├── Cell.tsx       # Individual cell component
│   └── Minesweeper.tsx # Main game component
├── types/             # TypeScript type definitions
│   └── game.ts       # Game-related types
└── utils/            # Utility functions
    ├── gameLogic.ts  # Core game logic
    └── aiSolver_fixed.ts # AI solving algorithms
```

## AI Algorithm Details

The AI solver uses a multi-layered approach:

- **Certainty Analysis**: Identifies 100% safe moves first
- **Constraint Propagation**: Uses mathematical constraints from revealed numbers
- **Probability Calculation**: Computes mine likelihood for each unrevealed cell
- **Pattern Matching**: Recognizes and exploits common board patterns

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Classic Minesweeper game mechanics
- Advanced solving algorithms inspired by competitive Minesweeper strategies
- Modern web development practices with Next.js and TypeScript
