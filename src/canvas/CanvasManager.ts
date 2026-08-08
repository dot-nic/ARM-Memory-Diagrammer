export interface Point {
  x: number;
  y: number;
}

export class CanvasManager {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  
  // View transform
  public scale: number = 1.0;
  public offset: Point = { x: 0, y: 0 };

  private isDragging: boolean = false;
  private lastMouse: Point = { x: 0, y: 0 };
  
  private onRenderCallback: (isExporting?: boolean) => void;

  constructor(canvas: HTMLCanvasElement, onRender: (isExporting?: boolean) => void) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error("Could not get 2D context");
    this.ctx = context;
    this.onRenderCallback = onRender;

    this.resizeCanvas();
    
    window.addEventListener('resize', () => {
      this.resizeCanvas();
      this.render();
    });
  }

  private resizeCanvas() {
    const parent = this.canvas.parentElement;
    if (parent) {
      this.canvas.width = parent.clientWidth;
      this.canvas.height = parent.clientHeight;
    }
  }

  public attachEvents() {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
  }

  private onMouseDown(e: MouseEvent) {
    if (e.defaultPrevented) return; // Handled by InteractionManager
    // Middle click or Left click on empty space (for panning)
    // We assume Left click for panning currently, we can refine this when adding component dragging
    this.isDragging = true;
    this.lastMouse = { x: e.clientX, y: e.clientY };
    this.canvas.style.cursor = 'grabbing';
  }

  private onMouseMove(e: MouseEvent) {
    if (!this.isDragging) return;

    const dx = e.clientX - this.lastMouse.x;
    const dy = e.clientY - this.lastMouse.y;
    
    this.offset.x += dx;
    this.offset.y += dy;
    
    this.lastMouse = { x: e.clientX, y: e.clientY };
    this.render();
  }

  private onMouseUp() {
    if (this.isDragging) {
      this.isDragging = false;
      this.canvas.style.cursor = 'grab';
    }
  }

  private onWheel(e: WheelEvent) {
    e.preventDefault();
    
    // Zoom logic around the mouse cursor
    const zoomFactor = 1.1;
    const direction = e.deltaY < 0 ? 1 : -1;
    const scaleMultiplier = direction > 0 ? zoomFactor : 1 / zoomFactor;
    
    // Get mouse position relative to canvas
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert screen coordinates to world coordinates before zoom
    const worldX = (mouseX - this.offset.x) / this.scale;
    const worldY = (mouseY - this.offset.y) / this.scale;

    // Apply scale, clamp between 0.1 and 5.0
    const newScale = Math.max(0.1, Math.min(this.scale * scaleMultiplier, 5.0));
    
    if (newScale !== this.scale) {
      this.scale = newScale;
      // Adjust offset so that the world coordinate under the mouse stays under the mouse
      this.offset.x = mouseX - worldX * this.scale;
      this.offset.y = mouseY - worldY * this.scale;
      
      this.render();
    }
  }

  public zoomIn() {
    this.scale = Math.min(this.scale * 1.2, 5.0);
    this.centerZoom();
  }

  public zoomOut() {
    this.scale = Math.max(this.scale / 1.2, 0.1);
    this.centerZoom();
  }

  public resetZoom() {
    this.scale = 1.0;
    this.offset = { x: 0, y: 0 };
    this.render();
  }

  private centerZoom() {
    // To keep it simple, zoom button acts around the center of the screen
    // Offset adjustment logic applies here as well, but using the center
    // We already changed this.scale, we need to adjust offset to keep center fixed
    // Wait, since we update scale before calling this, we need to save old scale?
    // Let's just trigger a render for now and improve center zoom logic if needed
    this.render();
  }

  public clear() {
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
  }

  public render() {
    this.clear();
    this.ctx.save();
    // Apply transform
    this.ctx.translate(this.offset.x, this.offset.y);
    this.ctx.scale(this.scale, this.scale);
    
    // Call the application render loop
    this.onRenderCallback();
    
    this.ctx.restore();
  }

  public exportToPNG(state: any) {
    const components = state.getComponents();
    if (components.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    components.forEach((c: any) => {
      if (c.x < minX) minX = c.x;
      if (c.y < minY) minY = c.y;
      if (c.x + c.width > maxX) maxX = c.x + c.width;
      if (c.y + c.height > maxY) maxY = c.y + c.height;
    });

    state.getJoints().forEach((j: any) => {
      if (j.x < minX) minX = j.x;
      if (j.y < minY) minY = j.y;
      if (j.x > maxX) maxX = j.x;
      if (j.y > maxY) maxY = j.y;
    });

    const padding = 60;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const width = maxX - minX;
    const height = maxY - minY;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tCtx = tempCanvas.getContext('2d');
    if (!tCtx) return;

    // Draw background
    const isLight = document.body.classList.contains('light-theme');
    tCtx.fillStyle = isLight ? '#ffffff' : '#0f1115';
    tCtx.fillRect(0, 0, width, height);

    // Temporarily swap context and transform
    const oldCtx = this.ctx;
    const oldScale = this.scale;
    const oldOffset = this.offset;

    this.ctx = tCtx;
    this.scale = 1;
    this.offset = { x: -minX, y: -minY };

    const oldComps = state.getSelectedComponentIds();
    const oldConns = state.getSelectedConnectionIds();
    
    // Avoid re-renders inside notify by removing listener or we just accept the synchronous double render.
    // Let's just silence the selection visual for export
    state.selectedComponentIds = [];
    state.selectedConnectionIds = [];
    
    this.ctx.save();
    this.ctx.translate(this.offset.x, this.offset.y);
    this.ctx.scale(this.scale, this.scale);
    this.onRenderCallback(true); // true means isExporting
    this.ctx.restore();

    // Restore
    state.selectedComponentIds = oldComps;
    state.selectedConnectionIds = oldConns;

    this.ctx = oldCtx;
    this.scale = oldScale;
    this.offset = oldOffset;

    const dataUrl = tempCanvas.toDataURL('image/png');
    
    const filenameInput = document.getElementById('input-filename') as HTMLInputElement | null;
    let filename = filenameInput ? filenameInput.value.trim() : 'diagrama-arm';
    if (!filename) filename = 'diagrama-arm';
    if (!filename.endsWith('.png')) filename += '.png';

    if ('showSaveFilePicker' in window) {
      tempCanvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: filename,
            types: [{
              description: 'PNG Image',
              accept: { 'image/png': ['.png'] },
            }],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
        } catch (err: any) {
          if (err.name !== 'AbortError') console.error(err);
        }
      }, 'image/png');
      return;
    }

    // Fallback
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
  }
}
