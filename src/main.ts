import './style.css';
import { CanvasManager } from './canvas/CanvasManager';
import { GridRenderer } from './canvas/GridRenderer';
import { Sidebar } from './ui/Sidebar';
import { DiagramState } from './models/DiagramState';
import { ComponentRenderer } from './canvas/ComponentRenderer';
import { ConnectionRenderer } from './canvas/ConnectionRenderer';
import { InteractionManager } from './canvas/InteractionManager';
import { PropertiesPanel } from './ui/PropertiesPanel';
import { MemoryComponent, DecoderComponent } from './models/types';

// Initialize Sidebar
new Sidebar();

// Get elements
const canvasEl = document.getElementById('main-canvas') as HTMLCanvasElement | null;
const btnZoomIn = document.getElementById('btn-zoom-in');
const btnZoomOut = document.getElementById('btn-zoom-out');
const btnZoomReset = document.getElementById('btn-zoom-reset');

if (!canvasEl) {
  throw new Error("Could not find canvas element");
}

let gridRenderer: GridRenderer;
let canvasManager: CanvasManager;
let componentRenderer: ComponentRenderer;
let connectionRenderer: ConnectionRenderer;
let interactionManager: InteractionManager;

const state = new DiagramState();

// Initialize Properties Panel
new PropertiesPanel(state);

// Generate a random ID helper
function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

// Render loop for the application
function renderApp(isExporting = false) {
  if (gridRenderer && !isExporting) gridRenderer.draw();

  if (connectionRenderer) {
    connectionRenderer.setContext(canvasManager.ctx);
    connectionRenderer.draw();
  }

  if (componentRenderer) {
    componentRenderer.setContext(canvasManager.ctx);
    componentRenderer.draw();
  }

  if (interactionManager && !isExporting) {
    interactionManager.draw(canvasManager.ctx);
  }
}

// Initialize Canvas & Subsystems
canvasManager = new CanvasManager(canvasEl, renderApp);
gridRenderer = new GridRenderer(canvasManager);
connectionRenderer = new ConnectionRenderer(canvasManager.ctx, state);
componentRenderer = new ComponentRenderer(canvasManager.ctx, state);

// Initialize Interaction
interactionManager = new InteractionManager(canvasManager, state, gridRenderer);

// Attach canvas events after interaction manager so InteractionManager gets events first
canvasManager.attachEvents();

// Re-render when state changes
state.subscribe(() => {
  canvasManager.render();
});

// Bind UI controls
btnZoomIn?.addEventListener('click', () => canvasManager.zoomIn());
btnZoomOut?.addEventListener('click', () => canvasManager.zoomOut());
btnZoomReset?.addEventListener('click', () => canvasManager.resetZoom());

const btnSave = document.getElementById('btn-save');
const btnLoad = document.getElementById('btn-load');
const btnExport = document.getElementById('btn-export');
const btnTheme = document.getElementById('btn-theme');
const fileInput = document.getElementById('file-load-input') as HTMLInputElement;
const filenameInput = document.getElementById('input-filename') as HTMLInputElement;

btnTheme?.addEventListener('click', () => {
  document.body.classList.toggle('light-theme');
  const isLight = document.body.classList.contains('light-theme');
  btnTheme.innerText = isLight ? '🌙' : '☀️';
  btnTheme.title = isLight ? 'Cambiar a Modo Oscuro' : 'Cambiar a Modo Claro';
  canvasManager.render();
});

btnSave?.addEventListener('click', async () => {
  let filename = filenameInput.value.trim() || 'diagrama-arm';
  if (!filename.endsWith('.json')) filename += '.json';

  const json = state.exportState();
  const blob = new Blob([json], { type: 'application/json' });

  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: 'JSON Diagram',
          accept: { 'application/json': ['.json'] },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error(err);
      return;
    }
  }

  // Fallback for browsers that don't support showSaveFilePicker
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
});

btnLoad?.addEventListener('click', () => {
  fileInput.click();
});

fileInput?.addEventListener('change', (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        state.importState(ev.target.result as string);
        // Reset file input so we can load the same file again if needed
        fileInput.value = '';
      }
    };
    reader.readAsText(file);
  }
});

btnExport?.addEventListener('click', () => {
  canvasManager.exportToPNG(state);
});

// Implement drop zone on canvas for drag & drop
canvasEl.addEventListener('dragover', (e: DragEvent) => {
  e.preventDefault(); // Necessary to allow dropping
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy';
  }
});

canvasEl.addEventListener('drop', (e: DragEvent) => {
  e.preventDefault();

  if (e.dataTransfer) {
    const componentType = e.dataTransfer.getData('application/x-component-type');
    if (componentType) {
      // Get drop coordinates relative to the canvas
      const rect = canvasEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Convert to world coordinates
      const worldX = (x - canvasManager.offset.x) / canvasManager.scale;
      const worldY = (y - canvasManager.offset.y) / canvasManager.scale;

      // Snap to grid
      const snappedX = gridRenderer.snap(worldX);
      const snappedY = gridRenderer.snap(worldY);

      if (componentType === 'memory') {
        const mem: MemoryComponent = {
          id: generateId(),
          type: 'memory',
          title: 'RAM',
          x: snappedX,
          y: snappedY,
          width: 120,
          height: 100,
          wordsStr: '1K',
          bits: 16,
          pins: [
            { id: generateId(), name: 'A[..]', type: 'input', activeLow: false, x: 0, y: 25 },
            { id: generateId(), name: 'R/W', type: 'control', activeLow: false, x: 0, y: 50 },
            { id: generateId(), name: 'CS', type: 'control', activeLow: true, x: 0, y: 75 },
            { id: generateId(), name: 'D[..]', type: 'output', activeLow: false, x: 120, y: 50 }
          ]
        };
        state.addComponent(mem);
        state.commit();
      } else if (componentType === 'decoder') {
        const dec: DecoderComponent = {
          id: generateId(),
          type: 'decoder',
          title: 'Decodificador',
          x: snappedX,
          y: snappedY,
          width: 100,
          height: 120,
          inputs: 3,
          outputs: 8,
          pins: [
            { id: generateId(), name: 'En', type: 'control', activeLow: true, x: 0, y: 20 },
            { id: generateId(), name: 'In', type: 'input', activeLow: false, x: 0, y: 60 },
            { id: generateId(), name: 'Q0', type: 'output', activeLow: false, x: 100, y: 20 },
            { id: generateId(), name: 'Q7', type: 'output', activeLow: false, x: 100, y: 100 }
          ]
        };
        state.addComponent(dec);
        state.commit();
      } else if (componentType === 'source') {
        const srcComponent = {
          id: generateId(),
          type: 'source' as const,
          title: 'A',
          x: snappedX,
          y: snappedY,
          width: 40,
          height: 40,
          pins: [
            { id: generateId(), name: 'A', type: 'output' as const, activeLow: false, x: 40, y: 20 }
          ]
        };
        state.addComponent(srcComponent);
        state.commit();
      }
    }
  }
});

// Initial render
canvasManager.render();
