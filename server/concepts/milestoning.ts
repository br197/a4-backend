import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";

export interface MilestoneDoc extends BaseDoc {
  userMilestones: Map<string, boolean>;
}

/**
 * concept: Milestone-ing [Milestone, User]
 */
export default class MilestoningConcept {
  public readonly milestones: DocCollection<MilestoneDoc>;
  private readonly initialBadges: Array<string>;

  /**
   * Make an instance of Milestone-ing.
   */
  constructor(collectionName: string) {
    this.milestones = new DocCollection<MilestoneDoc>(collectionName);
    this.initialBadges = ["Getting Started: Created Account", "Building Community", "Branching Out", "Post Superstar", "Knowledge Power", "Comment Guru"];
  }

  /**
   * Initialize users with a set of milestones they can complete.
   */
  async initializeUserMilestones() {
    const userMilestones: Map<string, boolean> = new Map();
    for (var b of this.initialBadges) {
      userMilestones.set(b, false);
    }
    const _id = await this.milestones.createOne({ userMilestones });
    return { msg: "User milestones initialized!", milestones: await this.milestones.readOne({ _id }) };
  }

  /**
   * User receives badge
   */
  async receiveBadge(_id: ObjectId, milestone: string) {
    const badge = await this.milestones.readOne({});
    if (badge !== null) {
      if (!badge.userMilestones.get(milestone)) {
        badge.userMilestones.set(milestone, true);
        await this.milestones.partialUpdateOne({ _id }, { userMilestones: badge.userMilestones });
        return { msg: `Milestone ${milestone} received!`, milestone: await this.milestones.readOne({ _id }) };
      }
    }
  }

  /**
   * Get badges that user has.
   */
  async getBadges(user: ObjectId) {
    // Returns all milestones! You might want to page for better client performance
    return await this.milestones.readOne({ user });
  }
}
