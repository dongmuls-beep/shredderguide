import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { HomeAgent } from "@/components/home-agent";
import { getDictionary, getShreddersData } from "@/lib/data-loader";

describe("home wizard integration", () => {
  it("shows 3 recommendations after completing wizard", async () => {
    const dictionary = getDictionary("ko");
    const data = getShreddersData();
    const user = userEvent.setup();

    render(<HomeAgent locale="ko" dictionary={dictionary} items={data.items} />);

    await user.click(
      screen.getByRole("button", {
        name: new RegExp(dictionary.wizard.profile.options.security_sensitive.title)
      })
    );

    const budgetInput = screen.getByLabelText(dictionary.wizard.budget.label);
    await user.selectOptions(budgetInput, "300000");
    await user.click(screen.getByRole("button", { name: dictionary.wizard.actions.submit }));

    expect(await screen.findAllByRole("link", { name: dictionary.recommendation.buyNow })).toHaveLength(3);
  });
});
