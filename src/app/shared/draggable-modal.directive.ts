import { Directive, ElementRef, HostListener, Input, OnDestroy, Renderer2, effect, signal } from '@angular/core';

/**
 * Makes the host element (a modal's outer card) draggable by mouse-dragging a
 * handle element inside it (default: ".modal-header"). Reusable across any
 * modal in the app - just add `appDraggableModal` to the card element; no
 * per-component drag state/handlers are needed.
 *
 * Usage:
 *   <div class="modal-card" appDraggableModal>
 *     <div class="modal-header">...</div>   <!-- drag handle -->
 *     ...
 *   </div>
 *
 * Clicks inside an element matching `dragIgnoreSelector` (default: the
 * header's close/X button) never start a drag.
 */
@Directive({
  selector: '[appDraggableModal]',
  standalone: true
})
export class DraggableModalDirective implements OnDestroy {
  /** CSS selector (relative to the host) that starts a drag on mousedown. */
  @Input() dragHandleSelector = '.modal-header';

  /** CSS selector for elements inside the handle that should NOT start a drag. */
  @Input() dragIgnoreSelector = '.icon-close-btn';

  private offset = signal({ x: 0, y: 0 }); // current translate offset from the card's natural position
  private isDragging = false;
  private dragStart = { x: 0, y: 0 };
  private offsetStart = { x: 0, y: 0 };

  constructor(private el: ElementRef<HTMLElement>, private renderer: Renderer2) {
    // Applies the translate transform to the host element whenever the offset signal changes.
    effect(() => {
      const { x, y } = this.offset();
      this.renderer.setStyle(this.el.nativeElement, 'transform', `translate(${x}px, ${y}px)`);
    });
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    if (this.dragIgnoreSelector && target.closest(this.dragIgnoreSelector)) {
      return; // e.g. clicking the header's close (X) button
    }
    if (!target.closest(this.dragHandleSelector)) {
      return; // mousedown started outside the drag handle
    }

    this.isDragging = true;
    this.dragStart = { x: event.clientX, y: event.clientY };
    this.offsetStart = { ...this.offset() };
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
    event.preventDefault(); // avoid text selection while dragging
  }

  // Arrow-function class fields so `this` and the listener reference stay stable
  // for addEventListener/removeEventListener.
  private onMouseMove = (event: MouseEvent): void => {
    if (!this.isDragging) {
      return;
    }
    const dx = event.clientX - this.dragStart.x;
    const dy = event.clientY - this.dragStart.y;
    this.offset.set({ x: this.offsetStart.x + dx, y: this.offsetStart.y + dy }); // signal write - triggers the effect() above
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  };

  ngOnDestroy(): void {
    // safety net in case the modal is destroyed mid-drag
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  }
}
