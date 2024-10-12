import DocCollection, { BaseDoc } from "../framework/doc";

export interface MapDoc extends BaseDoc {
  location: string;
}

/**
 * concept: Posting [Author]
 */
export default class MappingConcept {
  public readonly maps: DocCollection<MapDoc>;

  /**
   * Make an instance of Posting.
   */
  constructor(collectionName: string) {
    this.maps = new DocCollection<MapDoc>(collectionName);
  }
}
