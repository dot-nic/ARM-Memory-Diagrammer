import { DiagramState } from '../models/DiagramState';
import { DiagramComponent, MemoryComponent, DecoderComponent, Pin } from '../models/types';

export class ComponentRenderer {
  private ctx: CanvasRenderingContext2D;
  private state: DiagramState;

  private get colors() {
    const isLight = document.body.classList.contains('light-theme');
    if (isLight) {
      return {
        bg: '#ffffff',
        border: '#3b82f6',
        borderSelected: '#2563eb',
        textPrimary: '#0f172a',
        textSecondary: '#475569',
        pinLine: '#475569',
        shadowGlow: 'rgba(59, 130, 246, 0.4)'
      };
    }
    return {
      bg: '#1a1d24',
      border: '#3b82f6',
      borderSelected: '#60a5fa',
      textPrimary: '#e2e8f0',
      textSecondary: '#94a3b8',
      pinLine: '#94a3b8',
      shadowGlow: 'rgba(59, 130, 246, 0.5)'
    };
  }

  constructor(ctx: CanvasRenderingContext2D, state: DiagramState) {
    this.ctx = ctx;
    this.state = state;
  }

  public setContext(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  public draw() {
    const components = this.state.getComponents();
    const selectedIds = this.state.getSelectedComponentIds();

    // Render annotations (shapes and text) first so they are below others
    components.filter(c => c.type === 'shape' || c.type === 'text').forEach(comp => {
      this.drawComponent(comp, selectedIds.includes(comp.id));
    });

    // Render logic components on top
    components.filter(c => c.type !== 'shape' && c.type !== 'text').forEach(comp => {
      this.drawComponent(comp, selectedIds.includes(comp.id));
    });
  }

  private drawComponent(comp: DiagramComponent, isSelected: boolean) {
    this.ctx.save();
    this.ctx.translate(comp.x, comp.y);

    // Draw selection glow
    if (isSelected) {
      this.ctx.shadowColor = this.colors.shadowGlow;
      this.ctx.shadowBlur = 15;
    } else {
      // Base shadow
      this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
      this.ctx.shadowBlur = 4;
      this.ctx.shadowOffsetY = 2;
    }

    // Draw main body
    if (comp.type === 'shape') {
      const shape = comp as any;
      this.ctx.fillStyle = shape.fillColor && shape.fillColor !== 'transparent' ? shape.fillColor : 'rgba(0,0,0,0)';
    } else if (comp.type === 'text') {
      this.ctx.fillStyle = 'rgba(0,0,0,0)';
    } else {
      this.ctx.fillStyle = this.colors.bg;
    }
    
    this.ctx.strokeStyle = isSelected ? this.colors.borderSelected : (comp.color && comp.color !== 'transparent' ? comp.color : (comp.type === 'text' ? 'rgba(0,0,0,0)' : this.colors.border));
    this.ctx.lineWidth = isSelected ? 2 : 1;
    
    // Rounded rectangle
    const radius = comp.type === 'shape' ? 0 : 8;
    this.ctx.beginPath();
    this.ctx.roundRect(0, 0, comp.width, comp.height, radius);
    this.ctx.fill();
    
    if (comp.type !== 'text' || isSelected || (comp.color && comp.color !== 'transparent')) {
      this.ctx.stroke();
    }

    // Reset shadow for inner elements
    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetY = 0;

    // Draw Title/Label
    this.ctx.fillStyle = this.colors.textPrimary;
    this.ctx.font = '500 14px Inter, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    if (comp.type === 'text') {
      const txtComp = comp as any;
      this.ctx.font = `${txtComp.fontSize || 14}px Inter, sans-serif`;
      const lines = (txtComp.text || '').split('\n');
      const lineHeight = (txtComp.fontSize || 14) * 1.2;
      const totalHeight = lines.length * lineHeight;
      let startY = (comp.height - totalHeight) / 2 + lineHeight / 2;
      
      lines.forEach((line: string) => {
        this.ctx.fillText(line, comp.width / 2, startY);
        startY += lineHeight;
      });
    } else if (comp.type === 'memory') {
      const mem = comp as MemoryComponent;
      const label = `${mem.wordsStr} x ${mem.bits} bits`;
      this.ctx.fillText(label, comp.width / 2, comp.height / 2);
      
      this.ctx.fillStyle = this.colors.textSecondary;
      this.ctx.font = '10px Inter, sans-serif';
      this.ctx.fillText(mem.title || 'RAM', comp.width / 2, 16);
    } else if (comp.type === 'decoder') {
      const dec = comp as DecoderComponent;
      const label = `${dec.inputs}x${dec.outputs}`;
      this.ctx.fillText(`Decodificador`, comp.width / 2, comp.height / 2 - 8);
      this.ctx.font = 'bold 12px Inter, sans-serif';
      this.ctx.fillText(label, comp.width / 2, comp.height / 2 + 8);
    } else if (comp.type === 'source') {
      this.ctx.font = 'bold 16px Inter, sans-serif';
      this.ctx.fillText(comp.title, comp.width / 2, comp.height / 2);
    }

    const isHovered = this.state.getHoveredComponentId() === comp.id;

    if (comp.locked) {
      this.ctx.fillStyle = this.colors.textSecondary;
      this.ctx.font = '12px sans-serif';
      this.ctx.fillText('🔒', comp.width - 12, 12);
    } else if (isHovered) {
      this.ctx.fillStyle = this.colors.textSecondary;
      this.ctx.font = '12px sans-serif';
      this.ctx.fillText('🔓', comp.width - 12, 12);
    }

    // Draw pins
    comp.pins.forEach(pin => this.drawPin(pin));

    // Draw Resize Handles (dashed box with points) if selected
    if (isSelected) {
      this.ctx.strokeStyle = this.colors.borderSelected;
      this.ctx.setLineDash([5, 5]);
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(-4, -4, comp.width + 8, comp.height + 8);
      
      this.ctx.setLineDash([]);
      this.ctx.fillStyle = '#ffffff';
      
      const drawHandle = (hx: number, hy: number) => {
        this.ctx.beginPath();
        this.ctx.arc(hx, hy, 4, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
      };
      
      drawHandle(comp.width / 2, -4); // top
      drawHandle(comp.width / 2, comp.height + 4); // bottom
      drawHandle(-4, comp.height / 2); // left
      drawHandle(comp.width + 4, comp.height / 2); // right
      
      // Corner handles
      drawHandle(-4, -4); // top-left
      drawHandle(comp.width + 4, -4); // top-right
      drawHandle(-4, comp.height + 4); // bottom-left
      drawHandle(comp.width + 4, comp.height + 4); // bottom-right
    }

    this.ctx.restore();
  }

  private drawPin(pin: Pin) {
    this.ctx.save();
    
    const pinLength = 10;
    
    this.ctx.strokeStyle = this.colors.pinLine;
    this.ctx.lineWidth = 2;
    
    this.ctx.beginPath();
    this.ctx.moveTo(pin.x, pin.y);
    
    // Determine pin direction based on its position relative to the center
    // Assuming pins are on left/right for now
    let lineEndX = pin.x;
    let textX = pin.x;
    
    if (pin.x <= 0) {
      // Left side pin
      lineEndX = pin.x - pinLength;
      textX = pin.x + 5;
      this.ctx.textAlign = 'left';
    } else {
      // Right side pin
      lineEndX = pin.x + pinLength;
      textX = pin.x - 5;
      this.ctx.textAlign = 'right';
    }
    
    this.ctx.lineTo(lineEndX, pin.y);
    this.ctx.stroke();
    
    // Draw bubble if activeLow
    if (pin.activeLow) {
      this.ctx.beginPath();
      const bubbleRadius = 3;
      // Position bubble at the end of the line
      const bx = pin.x <= 0 ? lineEndX - bubbleRadius : lineEndX + bubbleRadius;
      this.ctx.arc(bx, pin.y, bubbleRadius, 0, Math.PI * 2);
      this.ctx.fillStyle = this.colors.bg;
      this.ctx.fill();
      this.ctx.stroke();
    }

    // Draw Pin Label
    this.ctx.fillStyle = this.colors.textSecondary;
    this.ctx.font = '10px Inter, sans-serif';
    this.ctx.textBaseline = 'middle';
    
    let label = pin.name;
    if (label === 'R/W') {
      if (pin.activeLow) {
        label = 'R/W\u0305'; // Overline on W
      } else {
        label = 'R\u0305/W'; // Overline on R
      }
    } else if (label === 'CS' && pin.activeLow) {
      label = 'C\u0305S\u0305'; // Overline on CS
    }
    
    this.ctx.fillText(label, textX, pin.y);
    
    this.ctx.restore();
  }
}
