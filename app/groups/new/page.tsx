import Header from "@/components/Header";
import { createGroup } from "@/app/groups/actions";

export default function NewGroupPage() {
  return (
    <>
      <Header />
      <div className="doc">
        <div className="doc-head">
          <h2>New group</h2>
        </div>
        <form action={createGroup}>
          <div className="field">
            <label htmlFor="name">Group name</label>
            <input id="name" name="name" type="text" required autoFocus placeholder="e.g. Uni friends" />
          </div>
          <button className="btn primary" type="submit">
            Create group
          </button>
        </form>
      </div>
    </>
  );
}
