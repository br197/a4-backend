import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotFoundError } from "./errors";

export interface MilestoneDoc extends BaseDoc {
  userMilestones: Map<string, ObjectId>;
}

/**
 * concept: Milestone-ing [Milestone, User]
 */
export default class MilestoningConcept {
  public readonly milestones: DocCollection<MilestoneDoc>;

  /**
   * Make an instance of Milestone-ing.
   */
  constructor(collectionName: string) {
    this.milestones = new DocCollection<MilestoneDoc>(collectionName);
  }

  /**
   * User receives badge
   */
  async receiveBadge(user: ObjectId, milestone: string) {
    const badge = await this.milestones.readOne({});

    if (badge == null) {
      throw new NotFoundError("Milestone doesn't exist");
    }

    //if (badge.userMilestones.includes(milestone)) {
    //badge.userMilestones.push(milestone);
    //}

    await this.milestones.partialUpdateOne({ user }, { userMilestones: badge.userMilestones });
    return { msg: "Milestone received successfully!", userMilestones: await this.milestones.readOne({ user }) };
  }

  async getBadges(user: ObjectId) {
    // Returns all milestones! You might want to page for better client performance
    return await this.milestones.readMany({ user });
  }
}
