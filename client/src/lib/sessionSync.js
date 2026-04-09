export const ADVISYS_SESSION_ACTIVITY_KEY = "advisys_session_activity";
export const ADVISYS_SESSION_LOGOUT_KEY = "advisys_session_logout";

export function publishSessionActivity(reason = "activity") {
  try {
    localStorage.setItem(
      ADVISYS_SESSION_ACTIVITY_KEY,
      JSON.stringify({ ts: Date.now(), reason })
    );
  } catch (_) {}
}

export function publishSessionLogout(reason = "logout") {
  try {
    localStorage.setItem(
      ADVISYS_SESSION_LOGOUT_KEY,
      JSON.stringify({ ts: Date.now(), reason })
    );
  } catch (_) {}
}
