import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const [name, width, height] of [
  ["desktop", 1440, 1000],
  ["tablet", 834, 1112],
  ["mobile", 390, 844],
] as const) {
  test(`landing e acessibilidade — ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Como saber se/ }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Somente essenciais" }).click();
    await expect(
      page.getByRole("region", { name: "Preferências de cookies" }),
    ).toHaveCount(0);
    await expect(page.locator("body")).not.toHaveJSProperty("scrollWidth", 0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: `test-results/landing-${name}.png`,
      fullPage: true,
    });
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      scan.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
    await page
      .getByRole("link", { name: "Já sou cliente", exact: true })
      .click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole("heading", { name: "Bom ter você de volta." }),
    ).toBeVisible();
    await page.screenshot({
      path: `test-results/login-${name}.png`,
      fullPage: true,
    });
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  });
}

test("simulação pública sem conta nem cartão", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/simular");
  await page.getByRole("button", { name: "Somente essenciais" }).click();
  await page.locator("#salario_base").fill("3000");
  await page.locator("#anos_completos").fill("5");
  await page.locator("#dias_no_mes").fill("30");
  await page.locator("#dias_trabalhados").fill("12");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.locator("#meses_periodo").fill("6");
  await page.locator("#meses_no_ano").fill("4");
  await page.locator("#total_fgts_depositado").fill("10000");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.locator("#valor_pago").fill("8500");
  await page.getByRole("checkbox", { name: /Meu caso é/ }).check();
  await page.getByRole("button", { name: "Ver minha simulação" }).click();
  await expect(
    page.getByRole("heading", { name: "Agora você tem um ponto de partida." }),
  ).toBeVisible();
  await expect(page.locator(".metric-card").nth(0)).toContainText("12.400,00");
  await expect(page.locator(".metric-card").nth(2)).toContainText("3.900,00");
  await page.screenshot({
    path: "test-results/simulation-mobile.png",
    fullPage: true,
  });
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});

test("cadastro → caso real → persistência → limites do plano → exclusão", async ({
  page,
}) => {
  const email = `qa-${Date.now()}@example.com`;
  const password = "Verba-qa-segura-123";
  await page.goto("/cadastro");
  await page.getByRole("button", { name: "Somente essenciais" }).click();
  await page.locator("#nome").fill("Pessoa QA");
  await page.locator("#email").fill(email);
  await page.locator("#senha").fill(password);
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  try {
    await expect(
      page.getByRole("heading", { name: "Vamos olhar para sua rescisão?" }),
    ).toBeVisible();
    await page.screenshot({
      path: "test-results/dashboard-empty.png",
      fullPage: true,
    });
    await page.getByRole("link", { name: "Criar meu primeiro caso" }).click();
    await page.locator("#nome").fill("Pessoa QA");
    await page.locator("#cpf").fill("52998224725");
    await page.locator("#cargo").fill("Assistente");
    await page.locator("#empregador").fill("Empresa QA");
    await page.locator("#admissao").fill("2021-01-10");
    await page.locator("#demissao").fill("2026-04-12");
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await expect(page.locator("#anos_completos")).toHaveValue("5");
    await page.locator("#salario_base").fill("3000");
    await page.locator("#dias_trabalhados").fill("12");
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await page.locator("#meses_periodo").fill("6");
    await page.locator("#meses_no_ano").fill("4");
    await page.locator("#total_fgts_depositado").fill("10000");
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await page.locator("#valor_pago").fill("8500");
    await page.getByRole("checkbox", { name: /Meu caso é/ }).check();
    await page.getByRole("button", { name: "Calcular e salvar" }).click();
    await expect(page).toHaveURL(/\/dashboard\/casos\/[a-f0-9-]+$/);
    await expect(page.locator(".metric-card").nth(0)).toContainText(
      "12.400,00",
    );
    await expect(page.locator("body")).not.toContainText("52998224725");
    await expect(
      page.getByText("***.***.***-25", { exact: false }),
    ).toBeVisible();
    await page.reload();
    await expect(page.locator(".metric-card").nth(2)).toContainText("3.900,00");
    for (const [name, width, height] of [
      ["desktop", 1440, 1000],
      ["tablet", 834, 1112],
      ["mobile", 390, 844],
    ] as const) {
      await page.setViewportSize({ width, height });
      await page.screenshot({
        path: `test-results/dashboard-${name}.png`,
        fullPage: true,
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
      const scan = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        scan.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
      ).toEqual([]);
    }
    const path = page.url().split("/casos/")[1];
    const pdf = await page.request.get(`/api/cases/${path}/pdf`);
    expect(pdf.status()).toBe(403);
    await page.goto(`/checkout?plano=avulso&caso=${path}`);
    await expect(page.getByText(/Checkout sandbox aguardando/)).toBeVisible();
    await page.goto("/checkout?plano=recorrente");
    await expect(
      page.getByText(
        "Cobrança recorrente de R$ 27,90 por mês, até cancelamento.",
      ),
    ).toBeVisible();
    await page.goto("/dashboard/configuracoes");
    await page
      .locator("#mensagem")
      .fill("Mensagem QA para verificar o registro de suporte.");
    await page.getByRole("button", { name: "Registrar solicitação" }).click();
    await expect(page.getByRole("status")).toContainText("Protocolo:");
  } finally {
    await page.goto("/dashboard/configuracoes");
    await page
      .getByRole("button", { name: "Excluir minha conta e meus dados" })
      .click();
    await page.locator("#delete-email").fill(email);
    await page.locator("#delete-password").fill(password);
    await page
      .getByRole("checkbox", { name: /Entendo que a exclusão/ })
      .check();
    await page.getByRole("button", { name: "Excluir definitivamente" }).click();
    await expect(page).toHaveURL(/\/login$/);
  }
});
