export class Sidebar {
  constructor() {
    this.initDragEvents();
  }

  private initDragEvents() {
    const items = document.querySelectorAll('.toolbox-item');
    
    items.forEach(item => {
      item.addEventListener('dragstart', (e: Event) => {
        const dragEvent = e as DragEvent;
        const target = e.currentTarget as HTMLElement;
        const type = target.dataset.type;
        
        if (dragEvent.dataTransfer && type) {
          dragEvent.dataTransfer.setData('application/x-component-type', type);
          // Set drag effect
          dragEvent.dataTransfer.effectAllowed = 'copy';
          
          // Optional: We can create a custom drag image here to make it look nicer
        }
      });
    });
  }
}
