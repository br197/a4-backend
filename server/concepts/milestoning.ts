import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotFoundError } from "./errors";

export interface MilestoneDoc extends BaseDoc {
  user: ObjectId;
  userMilestones: Map<string, boolean>;
}

/**
 * concept: Milestone-ing [User]
 */
export default class MilestoningConcept {
  public readonly milestones: DocCollection<MilestoneDoc>;
  private readonly initialBadges: Array<string>;

  /**
   * Make an instance of Milestone-ing.
   */
  constructor(collectionName: string) {
    this.milestones = new DocCollection<MilestoneDoc>(collectionName);
    this.initialBadges = ["Getting Started: Created Account", "Building Community", "Branching Out", "Post Superstar", "Comment Guru"];
  }

  /**
   * Initialize users with a set of milestones they can complete.
   */
  async initializeUserMilestones(user: ObjectId) {
    const userMilestones: Map<string, boolean> = new Map();
    for (var b of this.initialBadges) {
      userMilestones.set(b, false);
    }
    const _id = await this.milestones.createOne({ user, userMilestones });
    return { msg: "User milestones initialized!", milestones: await this.milestones.readOne({ _id }) };
  }

  /**
   * User receives badge
   */
  async receiveBadge(_id: ObjectId, milestone: string) {
    const badge = await this.milestones.readOne({ user: _id });
    if (badge !== null) {
      if (!(badge.userMilestones instanceof Map)) {
        badge.userMilestones = new Map(Object.entries(badge.userMilestones || {}));
      }
      if (!badge.userMilestones.get(milestone)) {
        badge.userMilestones.set(milestone, true);
        await this.milestones.partialUpdateOne({ user: _id }, { userMilestones: badge.userMilestones });
        return { msg: `Milestone "${milestone}" received!`, milestone: await this.milestones.readOne({ user: _id }) };
      }
      return { msg: `Milestone "${milestone}" already received!`, milestone: await this.milestones.readOne({ user: _id }) };
    }
    throw new NotFoundError("Milestones not found");
  }

  /**
   * Get badges that user has.
   */
  async getBadges(_id: ObjectId) {
    // Returns all milestones! You might want to page for better client performance
    return await this.milestones.readOne({ user: _id });
  }
}
