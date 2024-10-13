type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
type InputTag = "input" | "textarea" | "json";
type Field = InputTag | { [key: string]: Field };
type Fields = Record<string, Field>;

type Operation = {
  name: string;
  endpoint: string;
  method: HttpMethod;
  fields: Fields;
};

/**
 * This list of operations is used to generate the manual testing UI.
 */
const operations: Operation[] = [
  {
    name: "Get Session User (logged in user)",
    endpoint: "/api/session",
    method: "GET",
    fields: {},
  },
  {
    name: "Create User",
    endpoint: "/api/users",
    method: "POST",
    fields: { username: "input", password: "input" },
  },
  {
    name: "Login",
    endpoint: "/api/login",
    method: "POST",
    fields: { username: "input", password: "input" },
  },
  {
    name: "Logout",
    endpoint: "/api/logout",
    method: "POST",
    fields: {},
  },
  {
    name: "Update Password",
    endpoint: "/api/users/password",
    method: "PATCH",
    fields: { currentPassword: "input", newPassword: "input" },
  },
  {
    name: "Delete User",
    endpoint: "/api/users",
    method: "DELETE",
    fields: {},
  },
  {
    name: "Get Users (empty for all)",
    endpoint: "/api/users/:username",
    method: "GET",
    fields: { username: "input" },
  },
  {
    name: "Get Posts (empty for all)",
    endpoint: "/api/posts",
    method: "GET",
    fields: { author: "input" },
  },
  {
    name: "Create Post",
    endpoint: "/api/posts",
    method: "POST",
    fields: { groupNameToPostIn: "input", content: "input" },
  },
  {
    name: "Update Post",
    endpoint: "/api/posts/:id",
    method: "PATCH",
    fields: { id: "input", content: "input", options: { backgroundColor: "input" } },
  },
  {
    name: "Delete Post",
    endpoint: "/api/posts/:id",
    method: "DELETE",
    fields: { id: "input" },
  },
  {
    name: "Get all groups",
    endpoint: "/api/allGroups",
    method: "GET",
    fields: {},
  },
  {
    name: "Get groups user is in",
    endpoint: "/api/groups/:username",
    method: "GET",
    fields: { username: "input" },
  },
  {
    name: "Get all resource groups",
    endpoint: "/api/resourceGroups",
    method: "GET",
    fields: {},
  },
  {
    name: "Create Resource Group",
    endpoint: "/api/resourceGroups",
    method: "POST",
    fields: { groupName: "input", groupDescription: "input" },
  },
  {
    name: "Add Post or Comment To Resource Group",
    endpoint: "/api/resourceGroups/add/:resourceId",
    method: "POST",
    fields: { groupName: "input", resourceId: "input" },
  },
  {
    name: "Remove Resource from Resource Group",
    endpoint: "/api/resourceGroups/remove/:resourceId",
    method: "PATCH",
    fields: { groupName: "input", resourceId: "input" },
  },
  {
    name: "Create User Group",
    endpoint: "/api/groups",
    method: "POST",
    fields: { groupName: "input", groupDescription: "input" },
  },
  {
    name: "Delete Group",
    endpoint: "/api/groups/:groupName",
    method: "DELETE",
    fields: { groupName: "input" },
  },
  {
    name: "Join User Group",
    endpoint: "/api/groups/addUser",
    method: "POST",
    fields: { groupName: "input" },
  },
  {
    name: "Leave User Group",
    endpoint: "/api/groups/leave/:groupName",
    method: "PATCH",
    fields: { groupName: "input" },
  },
  {
    name: "Edit Group Name",
    endpoint: "/api/groups/name/:groupName",
    method: "PATCH",
    fields: { id: "input", groupName: "input" },
  },
  {
    name: "Edit Group Description",
    endpoint: "/api/groups/description/:groupDescription",
    method: "PATCH",
    fields: { id: "input", groupDescription: "input" },
  },
  {
    name: "Get Badges",
    endpoint: "/api/milestones/:id",
    method: "GET",
    fields: { id: "input" },
  },
  {
    name: "Get User Comments",
    endpoint: "/api/comment/:username",
    method: "GET",
    fields: { username: "input" },
  },
  {
    name: "Add Comment",
    endpoint: "/api/comment",
    method: "POST",
    fields: { postId: "input", content: "input" },
  },
  {
    name: "Update Comment",
    endpoint: "/api/comment/:newContent",
    method: "PATCH",
    fields: { id: "input", newContent: "input" },
  },
  {
    name: "Delete Comment",
    endpoint: "/api/comment/:commentId",
    method: "DELETE",
    fields: { commentId: "input" },
  },
  {
    name: "Opt In Location",
    endpoint: "/api/maps",
    method: "POST",
    fields: { city: "input", state: "input" },
  },
  {
    name: "Find Nearby Users (Click Submit to Use Opted In Location)",
    endpoint: "/api/maps/:id",
    method: "GET",
    fields: { city: "input", state: "input" },
  },
  {
    name: "Get Current Opted In Location",
    endpoint: "/api/maps/currentLocation/:id",
    method: "GET",
    fields: { userId: "input" },
  },
  {
    name: "Update Current Opted In Lcoation",
    endpoint: "/api/maps/:userId",
    method: "PATCH",
    fields: { userId: "input", city: "input", state: "input" },
  },
  {
    name: "Opt out Location",
    endpoint: "/api/maps/:userId",
    method: "DELETE",
    fields: { userId: "input" },
  },

  //
  // ...
  //
];

/*
 * You should not need to edit below.
 * Please ask if you have questions about what this test code is doing!
 */

function updateResponse(code: string, response: string) {
  document.querySelector("#status-code")!.innerHTML = code;
  document.querySelector("#response-text")!.innerHTML = response;
}

async function request(method: HttpMethod, endpoint: string, params?: unknown) {
  try {
    if (method === "GET" && params) {
      endpoint += "?" + new URLSearchParams(params as Record<string, string>).toString();
      params = undefined;
    }

    const res = fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: params ? JSON.stringify(params) : undefined,
    });

    return {
      $statusCode: (await res).status,
      $response: await (await res).json(),
    };
  } catch (e) {
    console.log(e);
    return {
      $statusCode: "???",
      $response: { error: "Something went wrong, check your console log.", details: e },
    };
  }
}

function fieldsToHtml(fields: Record<string, Field>, indent = 0, prefix = ""): string {
  return Object.entries(fields)
    .map(([name, tag]) => {
      const htmlTag = tag === "json" ? "textarea" : tag;
      return `
        <div class="field" style="margin-left: ${indent}px">
          <label>${name}:
          ${typeof tag === "string" ? `<${htmlTag} name="${prefix}${name}"></${htmlTag}>` : fieldsToHtml(tag, indent + 10, prefix + name + ".")}
          </label>
        </div>`;
    })
    .join("");
}

function getHtmlOperations() {
  return operations.map((operation) => {
    return `<li class="operation">
      <h3>${operation.name}</h3>
      <form class="operation-form">
        <input type="hidden" name="$endpoint" value="${operation.endpoint}" />
        <input type="hidden" name="$method" value="${operation.method}" />
        ${fieldsToHtml(operation.fields)}
        <button type="submit">Submit</button>
      </form>
    </li>`;
  });
}

function prefixedRecordIntoObject(record: Record<string, string>) {
  const obj: any = {}; // eslint-disable-line
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    const keys = key.split(".");
    const lastKey = keys.pop()!;
    let currentObj = obj;
    for (const key of keys) {
      if (!currentObj[key]) {
        currentObj[key] = {};
      }
      currentObj = currentObj[key];
    }
    currentObj[lastKey] = value;
  }
  return obj;
}

async function submitEventHandler(e: Event) {
  e.preventDefault();
  const form = e.target as HTMLFormElement;
  const { $method, $endpoint, ...reqData } = Object.fromEntries(new FormData(form));

  // Replace :param with the actual value.
  const endpoint = ($endpoint as string).replace(/:(\w+)/g, (_, key) => {
    const param = reqData[key] as string;
    delete reqData[key];
    return param;
  });

  const op = operations.find((op) => op.endpoint === $endpoint && op.method === $method);
  const pairs = Object.entries(reqData);
  for (const [key, val] of pairs) {
    if (val === "") {
      delete reqData[key];
      continue;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const type = key.split(".").reduce((obj, key) => obj[key], op?.fields as any);
    if (type === "json") {
      reqData[key] = JSON.parse(val as string);
    }
  }

  const data = prefixedRecordIntoObject(reqData as Record<string, string>);

  updateResponse("", "Loading...");
  const response = await request($method as HttpMethod, endpoint as string, Object.keys(data).length > 0 ? data : undefined);
  updateResponse(response.$statusCode.toString(), JSON.stringify(response.$response, null, 2));
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelector("#operations-list")!.innerHTML = getHtmlOperations().join("");
  document.querySelectorAll(".operation-form").forEach((form) => form.addEventListener("submit", submitEventHandler));
});
