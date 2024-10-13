import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface MapDoc extends BaseDoc {
  user: ObjectId;
  city: string;
  state: string;
}

/**
 * concept: Mapping [Item, User, Maps]
 */
export default class MappingConcept {
  public readonly maps: DocCollection<MapDoc>;

  /**
   * Make an instance of Mapping.
   */
  constructor(collectionName: string) {
    this.maps = new DocCollection<MapDoc>(collectionName);
  }

  /**
   * Creates a document for user with id `_id` located at `cityString`, `stateString`
   */
  async createMap(user: ObjectId, cityString: string, stateString: string) {
    const userLocation = await this.maps.readOne({ user: user });
    if (userLocation) {
      throw new NotAllowedError("You already opted in your location!");
    }

    if (!cityString || !stateString) {
      throw new Error("Both city and state need to be provided!");
    }

    const city = typeof cityString === "string" ? cityString.toLowerCase() : " ";
    const state = typeof stateString === "string" ? stateString.toLowerCase() : " ";
    const _id = await this.maps.createOne({ user, city, state });
    return { msg: "You successfully opted in your location!", location: await this.maps.readOne({ _id }) };
  }

  /**
   * Get users near city, state.
   */
  async findNearbyUsers(_id: ObjectId, cityString?: string, stateString?: string) {
    const findUserOptIn = await this.maps.readOne({ user: _id });
    if (!findUserOptIn) {
      throw new NotAllowedError("You have not opted in your location!");
    }

    if (!cityString || !stateString) {
      const users = await this.maps.readMany({ city: findUserOptIn.city, state: findUserOptIn.state });
      return { msg: "You have successfuly retrieved nearby users based on your opted in location!", nearbyUsers: users };
    } else {
      const city = cityString.toLowerCase();
      const state = stateString.toLowerCase();
      const users = await this.maps.readMany({ city: city, state: state });
      return { msg: "You have successfuly retrieved nearby users!", nearbyUsers: users };
    }
  }

  /**
   * Get current opted-in location.
   */
  async getCurrentLocation(_id: ObjectId) {
    const findUserOptIn = await this.maps.readOne({ user: _id });
    if (!findUserOptIn) {
      throw new NotAllowedError("You have not opted in your location!");
    }
    return { msg: "Successfuly retrieved your current opted in location!", location: await this.maps.readOne({ user: _id }) };
  }

  /**
   * Update user location city, state.
   */
  async updateUserLocation(_id: ObjectId, cityString: string, stateString: string) {
    const findUserOptIn = await this.maps.readOne({ user: _id });
    if (!findUserOptIn) {
      throw new NotAllowedError("You have not opted in your location!");
    }

    const city = cityString.toLowerCase();
    const state = stateString.toLowerCase();
    await this.maps.partialUpdateOne({ user: _id }, { city, state });
    return { msg: `You have successfuly updated your opted-in location to ${city}, ${state}`, location: await this.maps.readOne({ user: _id }) };
  }

  /**
   * Opt out of location.
   */
  async deleteUserLocation(_id: ObjectId) {
    const map = await this.maps.readOne({ user: _id });
    if (!map) {
      throw new NotFoundError(`Your location is not currently opted in!`);
    }
    await this.maps.deleteOne({ user: _id });
    return { msg: `Location of user ${_id} successfully opted out!` };
  }
}
