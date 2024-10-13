import { ObjectId } from "mongodb";

import { Router, getExpressRouter } from "./framework/router";

import { Authing, Commenting, Friending, Grouping, Mapping, Milestoning, Posting, Sessioning } from "./app";
import { PostOptions } from "./concepts/posting";
import { SessionDoc } from "./concepts/sessioning";
import Responses from "./responses";

import { z } from "zod";

/**
 * Web server routes for the app. Implements synchronizations between concepts.
 */
class Routes {
  // Synchronize the concepts from `app.ts`.

  @Router.get("/session")
  async getSessionUser(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Authing.getUserById(user);
  }

  @Router.get("/users")
  async getUsers() {
    return await Authing.getUsers();
  }

  @Router.get("/users/:username")
  @Router.validate(z.object({ username: z.string().min(1) }))
  async getUser(username: string) {
    return await Authing.getUserByUsername(username);
  }

  @Router.post("/users")
  async createUser(session: SessionDoc, username: string, password: string) {
    Sessioning.isLoggedOut(session);
    return await Authing.create(username, password);
  }

  @Router.patch("/users/username")
  async updateUsername(session: SessionDoc, username: string) {
    const user = Sessioning.getUser(session);
    return await Authing.updateUsername(user, username);
  }

  @Router.patch("/users/password")
  async updatePassword(session: SessionDoc, currentPassword: string, newPassword: string) {
    const user = Sessioning.getUser(session);
    return Authing.updatePassword(user, currentPassword, newPassword);
  }

  @Router.delete("/users")
  async deleteUser(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    Sessioning.end(session);
    return await Authing.delete(user);
  }

  @Router.post("/login")
  async logIn(session: SessionDoc, username: string, password: string) {
    const u = await Authing.authenticate(username, password);
    Sessioning.start(session, u._id);
    const userMilestones = await Milestoning.getBadges(u._id);
    const logIn = "Logged in!";
    var messages = [logIn];
    if (!userMilestones) {
      await Milestoning.initializeUserMilestones(u._id);
      const milestoneMsg = await Milestoning.receiveBadge(u._id, "Getting Started: Created Account");
      if (milestoneMsg) {
        messages.push(milestoneMsg.msg);
      }
    }
    return { msg: messages.join(" ") };
  }

  @Router.post("/logout")
  async logOut(session: SessionDoc) {
    Sessioning.end(session);
    return { msg: "Logged out!" };
  }

  @Router.get("/posts")
  @Router.validate(z.object({ author: z.string().optional() }))
  async getPosts(author?: string) {
    let posts;
    if (author) {
      const id = (await Authing.getUserByUsername(author))._id;
      posts = await Posting.getByAuthor(id);
    } else {
      posts = await Posting.getPosts();
    }
    return Responses.posts(posts);
  }

  @Router.post("/posts")
  async createPost(session: SessionDoc, groupNameToPostIn: string, content: string, options?: PostOptions) {
    const user = Sessioning.getUser(session);
    const groups = await Grouping.getUserGroups(user);
    const targetGroup = groups.userGroups.find((group) => group.groupName === groupNameToPostIn);
    if (!targetGroup) {
      throw new Error("User not in group!");
    }
    const created = await Posting.create(user, content, options);
    const messages = [created.msg];
    const userBadges = await Milestoning.getBadges(user);
    if (userBadges !== null) {
      if (!(userBadges.userMilestones instanceof Map)) {
        userBadges.userMilestones = new Map(Object.entries(userBadges.userMilestones || {}));
      }
      if (!userBadges.userMilestones.get("Post Superstar")) {
        const milestone = await Milestoning.receiveBadge(user, "Post Superstar");
        if (milestone) {
          messages.push(milestone.msg);
        }
      }
    }
    return { msg: messages.join(" "), post: await Responses.post(created.post) };
  }

  @Router.patch("/posts/:id")
  async updatePost(session: SessionDoc, id: string, content?: string, options?: PostOptions) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Posting.assertAuthorIsUser(oid, user);
    return await Posting.update(oid, content, options);
  }

  @Router.delete("/posts/:id")
  async deletePost(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Posting.assertAuthorIsUser(oid, user);
    return Posting.delete(oid);
  }

  @Router.get("/friends")
  async getFriends(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Authing.idsToUsernames(await Friending.getFriends(user));
  }

  @Router.delete("/friends/:friend")
  async removeFriend(session: SessionDoc, friend: string) {
    const user = Sessioning.getUser(session);
    const friendOid = (await Authing.getUserByUsername(friend))._id;
    return await Friending.removeFriend(user, friendOid);
  }

  @Router.get("/friend/requests")
  async getRequests(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Responses.friendRequests(await Friending.getRequests(user));
  }

  @Router.post("/friend/requests/:to")
  async sendFriendRequest(session: SessionDoc, to: string) {
    const user = Sessioning.getUser(session);
    const toOid = (await Authing.getUserByUsername(to))._id;
    return await Friending.sendRequest(user, toOid);
  }

  @Router.delete("/friend/requests/:to")
  async removeFriendRequest(session: SessionDoc, to: string) {
    const user = Sessioning.getUser(session);
    const toOid = (await Authing.getUserByUsername(to))._id;
    return await Friending.removeRequest(user, toOid);
  }

  @Router.put("/friend/accept/:from")
  async acceptFriendRequest(session: SessionDoc, from: string) {
    const user = Sessioning.getUser(session);
    const fromOid = (await Authing.getUserByUsername(from))._id;
    return await Friending.acceptRequest(fromOid, user);
  }

  @Router.put("/friend/reject/:from")
  async rejectFriendRequest(session: SessionDoc, from: string) {
    const user = Sessioning.getUser(session);
    const fromOid = (await Authing.getUserByUsername(from))._id;
    return await Friending.rejectRequest(fromOid, user);
  }

  @Router.get("/allGroups")
  async getAllGroups() {
    let groups;
    groups = await Grouping.getAllGroups();
    return await Responses.groups(groups);
  }

  @Router.get("/groups/:username")
  async getUserGroups(username: string) {
    let groups;
    const id = (await Authing.getUserByUsername(username))._id;
    groups = await Grouping.getUserGroups(id);
    return { msg: groups.msg, groups: await Responses.groups(groups.userGroups) };
  }

  @Router.get("/resourceGroups")
  async getResourceGroups() {
    let groups;
    groups = await Grouping.getResourceGroups();
    return { msg: "Retrieved all resource groups!", groups: await Responses.groups(groups) };
  }

  @Router.post("/resourceGroups")
  async createResourceGroup(session: SessionDoc, groupName: string, groupDescription: string) {
    const groupOwner = Sessioning.getUser(session);
    const resource = true;
    const created = await Grouping.createGroup(groupOwner, groupName, groupDescription, resource);
    return { msg: created.msg, group: await Responses.group(created.group) };
  }

  @Router.post("/resourceGroups/add/:resourceId")
  async addResourceToGroup(session: SessionDoc, resourceId: ObjectId, groupName: string) {
    const user = Sessioning.getUser(session);
    const posts = await Posting.getPosts();
    const comments = await Commenting.getComments();
    var isResource: boolean = false;
    for (var p of posts) {
      if (p._id.equals(resourceId)) {
        isResource = true;
        break;
      }
    }
    if (!isResource) {
      for (var c of comments) {
        if (c._id.equals(resourceId)) {
          isResource = true;
          break;
        }
      }
    }

    if (!isResource) {
      throw new Error("Item you are trying to add is not a resource (post or comment)!");
    }

    let created;
    created = await Grouping.addResourceToGroup(user, resourceId, groupName);
    return { msg: created.msg, group: await Responses.group(created.group) };
  }

  @Router.post("/groups")
  async createUserGroup(session: SessionDoc, groupName: string, groupDescription: string) {
    const groupOwner = Sessioning.getUser(session);
    const userBadges = await Milestoning.getBadges(groupOwner);
    const resource = false;
    if (userBadges !== null) {
      if (!(userBadges.userMilestones instanceof Map)) {
        userBadges.userMilestones = new Map(Object.entries(userBadges.userMilestones || {}));
      }
      if (userBadges.userMilestones.get("Comment Guru") && userBadges.userMilestones.get("Post Superstar") && userBadges.userMilestones.get("Getting Started: Created Account")) {
        const created = await Grouping.createGroup(groupOwner, groupName, groupDescription, resource);
        return { msg: created.msg, group: await Responses.group(created.group) };
      } else {
        const missingBadge: string[] = [];
        if (!userBadges.userMilestones.get("Comment Guru")) {
          missingBadge.push("Comment Guru");
        }
        if (!userBadges.userMilestones.get("Post Superstar")) {
          missingBadge.push("Post Superstar");
        }
        if (!userBadges.userMilestones.get("Getting Started: Created Account")) {
          missingBadge.push("Getting Started: Created Account");
        }
        return { msg: `You are unable to create a group because your are missing the following badges ${missingBadge}` };
      }
    }
  }

  @Router.post("/groups/addUser")
  async joinUserGroup(session: SessionDoc, groupName: string) {
    const user = Sessioning.getUser(session);
    let created;
    created = await Grouping.joinGroup(user, groupName);
    const messages = [created.msg];
    const userBadges = await Milestoning.getBadges(user);
    if (userBadges !== null) {
      if (!(userBadges.userMilestones instanceof Map)) {
        userBadges.userMilestones = new Map(Object.entries(userBadges.userMilestones || {}));
      }
      if (!userBadges.userMilestones.get("Building Community")) {
        const milestone = await Milestoning.receiveBadge(user, "Building Community");
        if (milestone) {
          messages.push(milestone.msg);
        }
      }
      return { msg: messages.join(" "), group: await Responses.group(created.group) };
    }
  }

  @Router.delete("/groups/:groupName")
  async deleteGroup(session: SessionDoc, groupName: string) {
    const groupOwner = Sessioning.getUser(session);
    const deleted = await Grouping.deleteGroup(groupOwner, groupName);
    return { msg: deleted.msg };
  }

  @Router.patch("/groups/leave/:groupName")
  async leaveGroup(session: SessionDoc, groupName: string) {
    const user = Sessioning.getUser(session);
    const leaving = await Grouping.leaveGroup(user, groupName);
    return { msg: leaving.msg };
  }

  @Router.patch("/resourceGroups/remove/:resourceId")
  async leaveResourceGroup(session: SessionDoc, groupName: string, resourceId: ObjectId) {
    const user = Sessioning.getUser(session);
    const leaving = await Grouping.leaveResourceGroup(user, groupName, resourceId);
    return { msg: leaving.msg };
  }

  @Router.patch("/groups/name/:groupName")
  async editGroupName(session: SessionDoc, id: string, groupName: string) {
    const groupOwner = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Grouping.assertIsGroupOwner(oid, groupOwner);
    return await Grouping.editGroupName(oid, groupName);
  }

  @Router.patch("/groups/description/:groupDescription")
  async editGroupDescription(session: SessionDoc, id: string, groupDescription: string) {
    const groupOwner = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Grouping.assertIsGroupOwner(oid, groupOwner);
    return await Grouping.editGroupDescription(oid, groupDescription);
  }

  @Router.get("/milestones/:id")
  async getMilestones(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    const milestones = await Milestoning.getBadges(user);
    return Responses.milestone(milestones);
  }

  @Router.get("/comment/:username")
  async getComment(username: string) {
    let comments;
    const id = (await Authing.getUserByUsername(username))._id;
    comments = await Commenting.getByAuthor(id);
    return Responses.comments(comments);
  }

  @Router.post("/comment")
  async createComment(session: SessionDoc, content: string, postId: ObjectId) {
    //create comments
    const user = Sessioning.getUser(session);
    const created = await Commenting.addComment(user, content, postId);
    const messages = [created.msg];
    const userBadges = await Milestoning.getBadges(user);
    if (userBadges !== null) {
      if (!(userBadges.userMilestones instanceof Map)) {
        userBadges.userMilestones = new Map(Object.entries(userBadges.userMilestones || {}));
      }
      if (!userBadges.userMilestones.get("Comment Guru")) {
        const milestone = await Milestoning.receiveBadge(user, "Comment Guru");
        if (milestone) {
          messages.push(milestone.msg);
        }
      }
    }
    return { msg: messages.join(" "), comment: await Responses.comment(created.comment) };
  }

  @Router.patch("/comment/:newContent")
  async updateComment(session: SessionDoc, id: ObjectId, newContent?: string) {
    //update comment contents
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Commenting.assertAuthorIsUser(oid, user);
    return await Commenting.update(oid, newContent);
  }

  @Router.delete("/comment/:commentId")
  async deleteComment(session: SessionDoc, commentId: ObjectId) {
    //delete comment with commentId
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(commentId);
    await Commenting.assertAuthorIsUser(oid, user);
    return await Commenting.delete(oid);
  }

  @Router.post("/maps")
  async createMap(session: SessionDoc, city: string, state: string) {
    const user = Sessioning.getUser(session);
    const map = await Mapping.createMap(user, city, state);
    return { msg: map.msg, map: await Responses.map(map.location) };
  }

  @Router.get("/maps/:id")
  async findNearbyUsers(session: SessionDoc, city: string, state: string) {
    const user = Sessioning.getUser(session);
    const map = await Mapping.findNearbyUsers(user, city, state);
    const messages = [map.msg];
    const userBadges = await Milestoning.getBadges(user);
    if (userBadges !== null) {
      if (!(userBadges.userMilestones instanceof Map)) {
        userBadges.userMilestones = new Map(Object.entries(userBadges.userMilestones || {}));
      }
      if (!userBadges.userMilestones.get("Branching Out")) {
        const milestone = await Milestoning.receiveBadge(user, "Branching Out");
        if (milestone) {
          messages.push(milestone.msg);
        }
      }
    }
    return { msg: messages.join(" "), map: await Responses.maps(map.nearbyUsers) };
  }

  @Router.get("/maps/currentLocation/:id")
  async getCurrentLocation(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    const map = await Mapping.getCurrentLocation(user);
    return { msg: map.msg, map: await Responses.map(map.location) };
  }

  @Router.patch("/maps/:user")
  async updateUserLocation(session: SessionDoc, city: string, state: string) {
    const user = Sessioning.getUser(session);
    const map = await Mapping.updateUserLocation(user, city, state);
    return { msg: map.msg, map: await Responses.map(map.location) };
  }

  @Router.delete("/maps/:user")
  async deleteUserLocation(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    const map = await Mapping.deleteUserLocation(user);
    return { msg: map.msg };
  }
}
/** The web app. */
export const app = new Routes();

/** The Express router. */
export const appRouter = getExpressRouter(app);
