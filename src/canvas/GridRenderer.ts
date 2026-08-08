import { CanvasManager } from './CanvasManager';

export class GridRenderer {
  public gridSize = 20;
  private canvasManager: CanvasManager;

  constructor(canvasManager: CanvasManager) {
    this.canvasManager = canvasManager;
  }

  public draw() {
    const ctx = this.canvasManager.ctx;
    const canvas = this.canvasManager.canvas;
    const scale = this.canvasManager.scale;
    const offset = this.canvasManager.offset;

    // We need to draw the grid covering the visible area of the canvas.
    // To do this, we calculate the world coordinates of the viewport's top-left and bottom-right corners.
    const startX = -offset.x / scale;
    const startY = -offset.y / scale;
    const endX = (canvas.width - offset.x) / scale;
    const endY = (canvas.height - offset.y) / scale;

    // Find the starting grid line coordinates
    const firstGridX = Math.floor(startX / this.gridSize) * this.gridSize;
    const firstGridY = Math.floor(startY / this.gridSize) * this.gridSize;

    ctx.save();
    
    // We adjust the grid line thickness based on scale to keep it visible but not overwhelming
    ctx.lineWidth = 1 / scale;

    // Since we are applying styles, we can read them from CSS variables or define them here
    // For simplicity, we define the dark mode colors directly, but ideal would be to match CSS
    const isLight = document.body.classList.contains('light-theme');
    const gridColorNormal = isLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.05)';
    const gridColorThick = isLight ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.1)';

    ctx.beginPath();
    
    // Draw vertical lines
    for (let x = firstGridX; x <= endX; x += this.gridSize) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    
    // Draw horizontal lines
    for (let y = firstGridY; y <= endY; y += this.gridSize) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    
    ctx.strokeStyle = gridColorNormal;
    ctx.stroke();

    // Draw thick lines every 5 grid squares
    ctx.beginPath();
    const thickGridSize = this.gridSize * 5;
    const firstThickX = Math.floor(startX / thickGridSize) * thickGridSize;
    const firstThickY = Math.floor(startY / thickGridSize) * thickGridSize;
    
    for (let x = firstThickX; x <= endX; x += thickGridSize) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    for (let y = firstThickY; y <= endY; y += thickGridSize) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    
    ctx.strokeStyle = gridColorThick;
    ctx.stroke();

    ctx.restore();
  }

  // Helper method for snapping a coordinate to the grid
  public snap(value: number): number {
    return Math.round(value / this.gridSize) * this.gridSize;
  }
}
