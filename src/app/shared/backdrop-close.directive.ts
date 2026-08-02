import { Directive, ElementRef, EventEmitter, HostListener, Output } from '@angular/core';

/**
 * Put on a modal/overlay backdrop element instead of `(click)="onCancel()"`.
 * A plain click binding fires whenever the click's mouseup lands on the
 * backdrop - which also happens when the user drags a text selection from
 * inside the modal card out past its edge and releases there, since the
 * browser resolves that click's target to the nearest common ancestor of the
 * mousedown/mouseup points (the backdrop), bypassing the card's
 * stopPropagation entirely. This only emits when BOTH the mousedown and the
 * click landed on the backdrop itself, so drag-to-select never closes it.
 */
@Directive({
  selector: '[appBackdropClose]',
  standalone: true
})
export class BackdropCloseDirective {
  @Output() appBackdropClose = new EventEmitter<void>();

  private pressedOnSelf = false;

  constructor(private el: ElementRef<HTMLElement>) {}

  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent): void {
    this.pressedOnSelf = event.target === this.el.nativeElement;
  }

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {
    if (this.pressedOnSelf && event.target === this.el.nativeElement) {
      this.appBackdropClose.emit();
    }
    this.pressedOnSelf = false;
  }
}
