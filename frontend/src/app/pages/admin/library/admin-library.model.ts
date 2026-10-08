/**
 * State filter of the library list.
 */
export type StateFilter = 'all' | 'active' | 'withdrawn' | 'finished';

/**
 * One button of the state filter.
 */
export interface StateFilterOption {
  /**
   * Filter applied when pressed.
   */
  readonly value: StateFilter;
  /**
   * Button label.
   */
  readonly label: string;
}

/**
 * Row action in flight, so only the pressed button spins while the whole row waits.
 */
export type RowAction = 'active' | 'finished' | 'save' | 'delete';
