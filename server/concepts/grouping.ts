import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";

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
  Create a user group.
  */
  async createGroup(groupOwner: ObjectId, groupName: string, groupDescription: string) {
    const group = await this.groups.readOne({ groupName });
    if (group) {
      return { msg: "Group already exists!", groupName };
    }
    const newGroup = await this.groups.createOne({ groupOwner, groupDescription, groupName });
    return { msg: "Group successfully created!", group: await this.groups.readOne({ newGroup }) };
  }

  /*
  Join a user group.
  */
  async joinUserGroup(addedGroupMember: ObjectId, groupName: string) {
    const group = await this.groups.readOne({ groupName });
    if (!group) {
      return { msg: "Group not found!", groupName };
    }
    const groupMembers: Array<ObjectId> = group.groupMembers;
    groupMembers.push(addedGroupMember);
    await this.groups.partialUpdateOne({ groupName }, { groupMembers });
    return { msg: "Members successfully joined!", groupMembers: await this.groups.readOne({ groupMembers }) };
  }

  /*
  Delete a user group.
  */
  async deleteUserGroup(groupOwner: ObjectId, groupName: string) {
    const group = await this.groups.readOne({ groupName });
    if (!group) {
      return { msg: "Group not found!", groupName };
    } else if (group.groupOwner != groupOwner) {
      return { msg: "You are not the owner of this group!" };
    }
    await this.groups.deleteOne({ groupName });
    return { msg: "Group successfully deleted!" };
  }

  /*
  Edit a user group name.
  */
  async editGroupName(_id: ObjectId, groupName: string) {
    await this.groups.partialUpdateOne({ _id }, { groupName });
    return { msg: "Group name successfully updated!" };
  }

  /*
  Edit a user group description.
  */
  async editGroupDescription(_id: ObjectId, groupDescription: string) {
    await this.groups.partialUpdateOne({ _id }, { groupDescription });
    return { msg: "Group description successfully updated!" };
  }
}
