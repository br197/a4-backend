import AuthenticatingConcept from "./concepts/authenticating";
import CommentingConcept from "./concepts/commenting";
import FriendingConcept from "./concepts/friending";
import GroupingConcept from "./concepts/grouping";
import MappingConcept from "./concepts/mapping";
import MilestoningConcept from "./concepts/milestoning";
import PostingConcept from "./concepts/posting";
import SessioningConcept from "./concepts/sessioning";

// The app is a composition of concepts instantiated here
// and synchronized together in `routes.ts`.
export const Sessioning = new SessioningConcept();
export const Authing = new AuthenticatingConcept("users");
export const Posting = new PostingConcept("posts");
export const Friending = new FriendingConcept("friends");
export const Grouping = new GroupingConcept("groups");
export const Milestoning = new MilestoningConcept("milestones");
export const Commenting = new CommentingConcept("comments");
export const Mapping = new MappingConcept("maps");
