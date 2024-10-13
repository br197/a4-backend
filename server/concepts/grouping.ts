import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface GroupDoc extends BaseDoc {
  groupMembers: Array<ObjectId>;
  groupOwner: ObjectId;
  groupDescription: string;
  groupName: string;
  resource: boolean;
}

/**
 * concept: Grouping [Collection, User, Items]
 */
export default class GroupingConcept {
  public readonly groups: DocCollection<GroupDoc>;

  /**
   * Make an instance of Grouping.
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
  Get all groups user is in or has.
  */
  async getUserGroups(_id: ObjectId) {
    const group = await this.groups.readMany({});
    var userGroups: Array<GroupDoc> = [];
    if (group) {
      for (var g of group) {
        if (g.groupMembers.some((member) => member.toString() === _id.toString() || g.groupOwner.toString() === _id.toString())) {
          userGroups.push(g);
        }
      }
    }
    return { msg: `User groups successfully retrieved!`, userGroups: userGroups };
  }

  /*
  Get all resource groups.
  */
  async getResourceGroups() {
    return await this.groups.readMany({ resource: true }, { sort: { _id: -1 } });
  }

  /*
  Create a group.
  */
  async createGroup(groupOwner: ObjectId, groupName: string, groupDescription: string, resource: boolean) {
    const group = await this.groups.readOne({ groupName });
    if (group) {
      throw new NotAllowedError(`Group ${groupName} already exists!`);
    }
    const groupMembers: Array<ObjectId> = [];
    const _id = await this.groups.createOne({ groupOwner, groupDescription, groupName, groupMembers, resource });
    return { msg: "Group successfully created!", group: await this.groups.readOne({ _id }) };
  }

  /*
    Add Resource to a group.
  */
  async addResourceToGroup(user: ObjectId, addedResource: ObjectId, groupName: string) {
    const group = await this.groups.readOne({ groupName });
    if (!group) {
      throw new NotFoundError(`Group ${groupName} does not exist!`);
    } else if (!(group.groupOwner.toString() === user.toString())) {
      throw new Error("You cannot add resources to the group, as you are not the owner of the group!");
    } else if (group.groupMembers.some((member) => member.toString() === addedResource.toString())) {
      throw new Error("Resource already in group!");
    }
    const groupMembers: Array<ObjectId> = group.groupMembers;
    groupMembers.push(addedResource);
    await this.groups.partialUpdateOne({ groupName }, { groupMembers });
    return { msg: `Resource successfully added to ${groupName} group!`, group: await this.groups.readOne({ groupName }) };
  }

  /*
  Join a user group.
  */
  async joinGroup(addedGroupMember: ObjectId, groupName: string) {
    const group = await this.groups.readOne({ groupName });
    if (!group) {
      throw new NotFoundError(`Group ${groupName} does not exist!`);
    } else if (group.resource) {
      throw new Error("Users can't join resource groups!");
    } else if (group.groupMembers.some((member) => member.toString() === addedGroupMember.toString()) || group.groupOwner.toString() === addedGroupMember.toString()) {
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
  Leave a user group.
  */
  async leaveGroup(_id: ObjectId, groupName: string) {
    const group = await this.groups.readOne({ groupName });
    if (!group) {
      throw new NotFoundError(`Group ${groupName} does not exist!`);
    } else if (group.groupMembers.some((member) => member.toString() === _id.toString())) {
      const index = group.groupMembers.findIndex((member) => member.toString() === _id.toString());
      group.groupMembers.splice(index, 1);
      await this.groups.partialUpdateOne({ groupName }, { groupMembers: group.groupMembers });
    } else {
      throw new NotFoundError(`Unable to delete user from group, because user not in group!`);
    }
    return { msg: `User successfully left the ${groupName} group!` };
  }

  /*
  Remove resource from a resource group.
  */
  async leaveResourceGroup(_id: ObjectId, groupName: string, resourceId: ObjectId) {
    const group = await this.groups.readOne({ groupName });
    if (!group) {
      throw new NotFoundError(`Group ${groupName} does not exist!`);
    } else if (!(group.groupOwner.toString() === _id.toString())) {
      throw new Error("User not owner of group!");
    } else if (group.groupMembers.some((member) => member.toString() === resourceId.toString())) {
      const index = group.groupMembers.findIndex((member) => member.toString() === resourceId.toString());
      group.groupMembers.splice(index, 1);
      await this.groups.partialUpdateOne({ groupName }, { groupMembers: group.groupMembers });
    } else {
      throw new NotFoundError(`Unable to delete item, because item not in group!`);
    }
    return { msg: `Resource successfully removed from the ${groupName} group!` };
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
