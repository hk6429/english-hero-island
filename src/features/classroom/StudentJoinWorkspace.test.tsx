import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StudentJoinWorkspace } from "./StudentJoinWorkspace";

describe("StudentJoinWorkspace", () => {
  it("shows an honest setup gate when no classroom backend is configured", () => {
    render(<StudentJoinWorkspace client={null} />);

    expect(
      screen.getByRole("heading", { name: "課堂連線尚未設定" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/不會產生假的活動代碼或加入結果/)).toBeInTheDocument();
    expect(screen.queryByLabelText("六碼活動代碼")).not.toBeInTheDocument();
  });
});
