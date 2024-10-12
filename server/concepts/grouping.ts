import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface GroupDoc extends BaseDoc {
  groupMembers: Array<ObjectId>;
  groupOwner: ObjectId;
  groupDescription: string;
  groupName: string;
}

/**
 * concept: Milestone-ing [Milestone, User]
 */
export default class GroupingConcept {
  public readonly groups: DocCollection<GroupDoc>;

  /**
   * Make an instance of Milestone-ing.
   */
  constructor(collectionName: string) {
    this.groups = new DocCollection<GroupDoc>(collectionName);
  }

  /*
  Get all groups.
  */
  async getAllGroups() {
    return await this.groups.readMany({}, { sort: { _id: -1 } });
  }

  /*
  Get all groups user is in.
  */
  async getUserGroups(_id: ObjectId) {
    const group = await this.groups.readMany({});
    var userGroups: Array<GroupDoc> = [];
    if (group) {
      for (var g of group) {
        if (g.groupMembers.some((member) => member.equals(_id)) || g.groupOwner.equals(_id)) {
          userGroups.push(g);
        }
      }
    }
    return { msg: `User groups successfully retrieved!`, userGroups: userGroups };
  }

  /*
  Create a group.
  */
  async createGroup(groupOwner: ObjectId, groupName: string, groupDescription: string) {
    const group = await this.groups.readOne({ groupName });
    if (group) {
      throw new NotAllowedError(`Group ${groupName} already exists!`);
    }
    const groupMembers: Array<ObjectId> = [];
    const _id = await this.groups.createOne({ groupOwner, groupDescription, groupName, groupMembers });
    return { msg: "Group successfully created!", group: await this.groups.readOne({ _id }) };
  }

  /*
  Join a user group.
  */
  async joinGroup(addedGroupMember: ObjectId, groupName: string) {
    const group = await this.groups.readOne({ groupName });
    if (!group) {
      throw new NotFoundError(`Group ${groupName} does not exist!`);
    } else if (group.groupMembers.some((member) => member.equals(addedGroupMember)) || group.groupOwner.equals(addedGroupMember)) {
      throw new Error("User already in group!");
    }
    const groupMembers: Array<ObjectId> = group.groupMembers;
    groupMembers.push(addedGroupMember);
    await this.groups.partialUpdateOne({ groupName }, { groupMembers });
    return { msg: "Members successfully joined!", group: await this.groups.readOne({ groupName }) };
  }

  /*
  Delete a group.
  */
  async deleteGroup(groupOwner: ObjectId, groupName: string) {
    const group = await this.groups.readOne({ groupName });
    if (!group) {
      throw new NotFoundError(`Group ${groupName} does not exist!`);
    } else if (group.groupOwner.toString() !== groupOwner.toString()) {
      throw new NotAllowedError(`You, user ${groupOwner}, are not the owner, ${group.groupOwner} of this group!`);
    }
    await this.groups.deleteOne({ groupName });
    return { msg: `Group ${groupName} successfully deleted!` };
  }

  /*
  Leave a group.
  */
  async leaveGroup(_id: ObjectId, groupName: string) {
    const group = await this.groups.readOne({ groupName });
    if (!group) {
      throw new NotFoundError(`Group ${groupName} does not exist!`);
    } else if (group.groupMembers.some((member) => member.equals(_id))) {
      const index = group.groupMembers.findIndex((member) => member.equals(_id));
      group.groupMembers.splice(index, 1);
      await this.groups.partialUpdateOne({ groupName }, { groupMembers: group.groupMembers });
    } else {
      throw new NotFoundError(`User not in group!`);
    }
    return { msg: `You have successfully left the ${groupName} group!` };
  }

  /*
  Edit a group name.
  */
  async editGroupName(_id: ObjectId, groupName: string) {
    await this.groups.partialUpdateOne({ _id }, { groupName });
    return { msg: `Group name successfully updated to ${groupName}!` };
  }

  /*
  Edit a group description.
  */
  async editGroupDescription(_id: ObjectId, groupDescription: string) {
    await this.groups.partialUpdateOne({ _id }, { groupDescription });
    return { msg: `Group description successfully updated to ${groupDescription}!` };
  }

  async assertIsGroupOwner(_id: ObjectId, user: ObjectId) {
    const group = await this.groups.readOne({ _id });
    if (!group) {
      throw new NotFoundError(`Group ${_id} does not exist ${group}!`);
    }
    if (group.groupOwner.toString() !== user.toString()) {
      throw new GroupOwnerNotMatchError(user, _id);
    }
  }
}

export class GroupOwnerNotMatchError extends NotAllowedError {
  constructor(
    public readonly user: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not the owner of group {1}!", user, _id);
  }
}
