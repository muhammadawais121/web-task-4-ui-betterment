
class GridBuilder {
  constructor() {
    this.isMouseDown = false
    this.startCell = null
    this.currentBlock = null
    this.blocks = []
    this.history = []
    this.historyIndex = -1
    this.cellWidth = 0
    this.cellHeight = 60
    this.activeTab = "html"
    this.init()
  }

  init() {
    this.setupEventListeners()
    this.generateGrid()
    this.hideLoading()
    this.setupNav()
    this.setupProgress()
    this.setupKeyboard()
  }

  hideLoading() {
    setTimeout(() => {
      const loading = document.getElementById("loading")
      loading.classList.add("hidden")
      setTimeout(() => loading.remove(), 350)
    }, 1500)
  }

  setupNav() {
    const nav = document.getElementById("nav")
    const header = document.querySelector(".hero")
    const observer = new IntersectionObserver(
      ([entry]) => {
        nav.classList.toggle("visible", !entry.isIntersecting)
      },
      { threshold: 0.1 },
    )
    observer.observe(header)
  }

  setupProgress() {
    const bar = document.getElementById("progressBar")
    window.addEventListener("scroll", () => {
      const scrollPercent = (window.pageYOffset / (document.body.scrollHeight - window.innerHeight)) * 100
      bar.style.width = scrollPercent + "%"
    })
  }

  setupKeyboard() {
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "z":
            e.preventDefault()
            this.undo()
            break
          case "y":
            e.preventDefault()
            this.redo()
            break
          case "c":
            e.preventDefault()
            this.copyCode()
            break
          case "s":
            e.preventDefault()
            this.save()
            break
        }
      }
    })
  }

  setupEventListeners() {
    document.addEventListener("mouseup", () => this.endDrag())
    document.addEventListener("touchend", () => this.endDrag())
  }

  generateGrid() {
    const rows = +document.getElementById("rows").value
    const cols = +document.getElementById("cols").value
    const grid = document.getElementById("grid")

    grid.innerHTML = ""
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`
    grid.style.gridTemplateRows = `repeat(${rows}, ${this.cellHeight}px)`

    for (let i = 0; i < rows * cols; i++) {
      const cell = document.createElement("div")
      cell.className = "grid-cell"
      cell.dataset.row = Math.floor(i / cols) + 1
      cell.dataset.col = (i % cols) + 1

      cell.addEventListener("mousedown", (e) => this.startDrag(e, cell))
      cell.addEventListener("mouseenter", (e) => this.continueDrag(e, cell))
      cell.addEventListener("touchstart", (e) => this.startDrag(e, cell), { passive: false })
      cell.addEventListener("touchmove", (e) => this.continueDragTouch(e), { passive: false })

      grid.appendChild(cell)
    }

    this.cellWidth = grid.clientWidth / cols
    document.getElementById("gridInfo").textContent = `${rows}×${cols} Grid`
    this.clearBlocks()
    this.updateCode()
    this.saveState()
  }

  startDrag(e, cell) {
    e.preventDefault()
    this.isMouseDown = true
    this.startCell = cell
    this.createBlock(cell, cell)
  }

  continueDrag(e, cell) {
    if (!this.isMouseDown || !this.startCell || !this.currentBlock) return
    e.preventDefault()
    this.updateBlockDimensions(this.startCell, cell)
  }

  continueDragTouch(e) {
    if (!this.isMouseDown || !this.startCell || !this.currentBlock) return
    e.preventDefault()
    const touch = e.touches[0]
    const el = document.elementFromPoint(touch.clientX, touch.clientY)
    if (el?.classList.contains("grid-cell")) {
      this.continueDrag(e, el)
    }
  }

  endDrag() {
    if (this.isMouseDown && this.currentBlock) this.saveState()
    this.isMouseDown = false
    this.startCell = null
    this.currentBlock = null
  }

  createBlock(startCell, endCell) {
    const block = document.createElement("div")
    block.className = "block"
    block.dataset.number = this.blocks.length + 1

    block.addEventListener("dblclick", (e) => {
      e.stopPropagation()
      this.removeBlock(block)
    })

    if (!this.updateBlockDimensions(startCell, endCell, block)) return

    this.blocks.push(block)
    document.getElementById("grid").appendChild(block)
    this.currentBlock = block
    this.updateCode()
    this.showToast("Block created!", "success")
  }

  removeBlock(block) {
    block.remove()
    this.blocks = this.blocks.filter((b) => b !== block)
    this.renumberBlocks()
    this.updateCode()
    this.saveState()
    this.showToast("Block removed!", "info")
  }

  renumberBlocks() {
    this.blocks.forEach((block, index) => {
      block.dataset.number = index + 1
      block.textContent = `Block ${index + 1}`
    })
  }

  updateBlockDimensions(startCell, endCell, block = this.currentBlock) {
    if (!block) return false

    const rows = +document.getElementById("rows").value
    const cols = +document.getElementById("cols").value

    const r1 = Math.max(1, Math.min(rows, +startCell.dataset.row))
    const c1 = Math.max(1, Math.min(cols, +startCell.dataset.col))
    const r2 = Math.max(1, Math.min(rows, +endCell.dataset.row))
    const c2 = Math.max(1, Math.min(cols, +endCell.dataset.col))

    const rowStart = Math.min(r1, r2)
    const rowEnd = Math.max(r1, r2)
    const colStart = Math.min(c1, c2)
    const colEnd = Math.max(c1, c2)

    const left = (colStart - 1) * (this.cellWidth + 6)
    const width = (colEnd - colStart + 1) * (this.cellWidth + 6) - 6
    const top = (rowStart - 1) * (this.cellHeight + 6)
    const height = (rowEnd - rowStart + 1) * (this.cellHeight + 6) - 6

    for (const existingBlock of this.blocks) {
      if (existingBlock === block) continue
      const eLeft = +existingBlock.style.left.replace("px", "")
      const eWidth = +existingBlock.style.width.replace("px", "")
      const eTop = +existingBlock.style.top.replace("px", "")
      const eHeight = +existingBlock.style.height.replace("px", "")

      if (!(left + width <= eLeft || left >= eLeft + eWidth || top + height <= eTop || top >= eTop + eHeight)) {
        return false
      }
    }

    block.style.left = `${left}px`
    block.style.width = `${width}px`
    block.style.top = `${top}px`
    block.style.height = `${height}px`
    block.textContent = `Block ${block.dataset.number}`
    return true
  }

  clearBlocks() {
    this.blocks.forEach((b) => b.remove())
    this.blocks = []
    this.updateCode()
    this.saveState()
    this.showToast("Blocks cleared!", "info")
  }

  updateCode() {
    const rows = document.getElementById("rows").value
    const cols = document.getElementById("cols").value
    const codes = {
      html: this.generateHTML(),
      css: this.generateCSS(rows, cols),
      scss: this.generateSCSS(rows, cols),
      react: this.generateReact(),
    }

    document.getElementById("codeOutput").textContent = codes[this.activeTab]
    document.getElementById("codeLabel").textContent = `${this.activeTab.toUpperCase()} Code`
    setTimeout(() => window.Prism?.highlightAll(), 100)
  }

  generateHTML() {
    let html = '<div class="grid-container">\n'
    this.blocks.forEach((block) => {
      html += `  <div class="grid-item item-${block.dataset.number}">Block ${block.dataset.number}</div>\n`
    })
    return html + "</div>"
  }

  generateCSS(rows, cols) {
    return `.grid-container {
  display: grid;
  grid-template-rows: repeat(${rows}, 60px);
  grid-template-columns: repeat(${cols}, 1fr);
  gap: 6px;
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
  background: #f8fafc;
  border-radius: 12px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.grid-item {
  background: rgba(59, 130, 246, 0.1);
  border: 2px solid #3b82f6;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  transition: all 0.25s ease;
}

.grid-item:hover {
  background: rgba(59, 130, 246, 0.2);
  transform: scale(1.02);
}`
  }

  generateSCSS(rows, cols) {
    return `$grid-rows: ${rows};
$grid-cols: ${cols};
$primary-color: #3b82f6;

.grid-container {
  display: grid;
  grid-template-rows: repeat($grid-rows, 60px);
  grid-template-columns: repeat($grid-cols, 1fr);
  gap: 6px;
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
  background: #f8fafc;
  border-radius: 12px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);

  .grid-item {
    background: rgba($primary-color, 0.1);
    border: 2px solid $primary-color;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    transition: all 0.25s ease;

    &:hover {
      background: rgba($primary-color, 0.2);
      transform: scale(1.02);
    }
  }
}`
  }

  generateReact() {
    const items = this.blocks.map((_, i) => `    { id: ${i + 1}, content: 'Block ${i + 1}' }`).join(",\n")
    return `import React from 'react';
import './GridComponent.css';

const GridComponent = () => {
  const gridItems = [
${items}
  ];

  return (
    <div className="grid-container">
      {gridItems.map(item => (
        <div key={item.id} className={\`grid-item item-\${item.id}\`}>
          {item.content}
        </div>
      ))}
    </div>
  );
};

export default GridComponent;`
}
  saveState() {
    const state = {
      blocks: this.blocks.map((block) => ({
        number: block.dataset.number,
        left: block.style.left,
        width: block.style.width,
        top: block.style.top,
        height: block.style.height,
      })),
      rows: document.getElementById("rows").value,
      cols: document.getElementById("cols").value,
    }

    this.history = this.history.slice(0, this.historyIndex + 1)
    this.history.push(JSON.stringify(state))
    this.historyIndex++
    if (this.history.length > 20) {
      this.history.shift()
      this.historyIndex--
    }
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--
      this.restoreState()
      this.showToast("Undone!", "info")
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++
      this.restoreState()
      this.showToast("Redone!", "info")
    }
  }

  restoreState() {
    if (this.historyIndex >= 0 && this.historyIndex < this.history.length) {
      const state = JSON.parse(this.history[this.historyIndex])
      document.getElementById("rows").value = state.rows
      document.getElementById("cols").value = state.cols
      this.generateGrid()

      state.blocks.forEach((blockData) => {
        const block = document.createElement("div")
        block.className = "block"
        block.dataset.number = blockData.number
        Object.assign(block.style, blockData)
        block.textContent = `Block ${blockData.number}`
        block.addEventListener("dblclick", (e) => {
          e.stopPropagation()
          this.removeBlock(block)
        })
        this.blocks.push(block)
        document.getElementById("grid").appendChild(block)
      })
      this.updateCode()
    }
  }

  switchTab(tab) {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"))
    document.querySelector(`[onclick="switchTab('${tab}')"]`).classList.add("active")
    this.activeTab = tab
    this.updateCode()
  }

  copyCode() {
    const code = document.getElementById("codeOutput").textContent
    navigator.clipboard.writeText(code).then(
      () => this.showToast("Code copied!", "success"),
      () => this.showToast("Copy failed!", "error"),
    )
  }

  downloadCode() {
    const code = document.getElementById("codeOutput").textContent
    const extensions = { html: "html", css: "css", scss: "scss", react: "jsx" }
    const filename = `grid-layout.${extensions[this.activeTab]}`
    const blob = new Blob([code], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    this.showToast(`${filename} downloaded!`, "success")
  }

  save() {
    const data = {
      name: "Grid Layout Project",
      timestamp: new Date().toISOString(),
      rows: document.getElementById("rows").value,
      cols: document.getElementById("cols").value,
      blocks: this.blocks.map((block) => ({
        number: block.dataset.number,
        left: block.style.left,
        width: block.style.width,
        top: block.style.top,
        height: block.style.height,
      })),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "grid-project.json"
    a.click()
    URL.revokeObjectURL(url)
    this.showToast("Project saved!", "success")
  }

  load() {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = (e) => {
      const file = e.target.files[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target.result)
            this.loadProject(data)
            this.showToast("Project loaded!", "success")
          } catch {
            this.showToast("Load failed!", "error")
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  loadProject(data) {
    document.getElementById("rows").value = data.rows
    document.getElementById("cols").value = data.cols
    this.generateGrid()
    data.blocks.forEach((blockData) => {
      const block = document.createElement("div")
      block.className = "block"
      block.dataset.number = blockData.number
      Object.assign(block.style, blockData)
      block.textContent = `Block ${blockData.number}`
      block.addEventListener("dblclick", (e) => {
        e.stopPropagation()
        this.removeBlock(block)
      })
      this.blocks.push(block)
      document.getElementById("grid").appendChild(block)
    })
    this.updateCode()
    this.saveState()
  }

  showToast(message, type = "info") {
    const container = document.getElementById("toastContainer")
    const toast = document.createElement("div")
    toast.className = `toast ${type}`
    const icons = { success: "check-circle", error: "exclamation-circle", info: "info-circle" }
    toast.innerHTML = `<i class="fas fa-${icons[type]}"></i><span>${message}</span>`
    container.appendChild(toast)
    setTimeout(() => toast.remove(), 3000)
  }
}
function toggleTheme() {
  document.body.classList.toggle("dark")
  localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light")
}

function loadTheme() {
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark")
  }
}
let gridBuilder
function generateGrid() {
  gridBuilder.generateGrid()
}
function clearBlocks() {
  gridBuilder.clearBlocks()
}
function switchTab(tab) {
  gridBuilder.switchTab(tab)
}
function copyCode() {
  gridBuilder.copyCode()
}
function downloadCode() {
  gridBuilder.downloadCode()
}
function undo() {
  gridBuilder.undo()
}
function redo() {
  gridBuilder.redo()
}
function save() {
  gridBuilder.save()
}
function load() {
  gridBuilder.load()
}
function loadPreset() {
  gridBuilder.loadProject({
    rows: 4,
    cols: 4,
    blocks: [
      { number: 1, left: "0px", width: "194px", top: "0px", height: "60px" },
      { number: 2, left: "200px", width: "194px", top: "0px", height: "60px" },
      { number: 3, left: "0px", width: "394px", top: "66px", height: "126px" },
      { number: 4, left: "0px", width: "194px", top: "198px", height: "60px" },
    ],
  })
}
function toggleGrid() {
  gridBuilder.showToast("Grid lines toggled!", "info")
}
function toggleSnap() {
  gridBuilder.showToast("Snap toggled!", "info")
}
function scrollTo(selector) {
  document.querySelector(selector)?.scrollIntoView({ behavior: "smooth" })
}

function showDemo() {
  document.getElementById("demoModal").classList.add("active")
}

function closeModal() {
  document.getElementById("demoModal").classList.remove("active")
}
document.addEventListener("DOMContentLoaded", () => {
  loadTheme()
  gridBuilder = new GridBuilder()
})
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal")) {
    e.target.classList.remove("active")
  }
})
document.querySelectorAll(".nav-links a").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault()
    const target = link.getAttribute("href")
    scrollTo(target)
  })
})
