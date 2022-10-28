type NodeElement<T> = {
  value: T
  next: NodeElement<T> | null
}

export class LinkedList<T> {
  public head: NodeElement<T> | null = null;

  public constructor() {

  }

  public add(value: T) {
    if (!this.head) {
      this.head = { value: value, next: null };
      return;
    }

    let lastElement: NodeElement<T> | null = this.head;

    while (lastElement?.next !== null) {
      lastElement = lastElement?.next;
    }

    lastElement.next = { value: value, next: null }
  }

  public forEach(func: (element: NodeElement<T>) => void): void {
    let current = this.head;

    if(!current) {
      return;
    }

    while(current !== null) {
      func(current);
      current = current.next;
    }
  }

  public addSorted(value: T) {
    if (!this.head) {
      this.head = { value: value, next: null };
      return;
    }

    let current: NodeElement<T> | null = this.head;

    if(this.head.value <= value) {
      this.head = { value: value, next: this.head };
      current = this.head;
      return;
    }

    while (current !== null && current.next != null) {

      if (current.next.value <= value) {
        current.next = { value: value, next: current.next.next };
      }

      current = current?.next;
    }
  }

  public sort(): void {
    if(this.head === null) {
      return;
    }

    const newList = new LinkedList<T>();
    this.forEach(current => newList.addSorted(current.value));
    this.head = newList.head;
  }

  public print(): void {
    this.forEach(x => console.log(x.value));
  }
}


