export const PG_ENDPOINT_KEYS = {
  login: "PG_LOGIN_URL",
  week: "PG_WEEK_URL_TEMPLATE",
  day: "PG_DAY_URL_TEMPLATE",
  recipe: "PG_RECIPE_URL_TEMPLATE",
  shoppingList: "PG_SHOPPINGLIST_URL_TEMPLATE",
} as const;

export const PG_ENDPOINT_DEFAULTS = {
  PG_LOGIN_URL: "https://backend.projectgezond.nl/api/login",
  PG_WEEK_URL_TEMPLATE: "https://backend.projectgezond.nl/api/v3/week-menus/{week}",
  PG_DAY_URL_TEMPLATE: "https://backend.projectgezond.nl/api/v3/daymenus/{dayId}",
  PG_RECIPE_URL_TEMPLATE: "https://backend.projectgezond.nl/api/v3/recipes/{recipeId}",
  PG_SHOPPINGLIST_URL_TEMPLATE: "https://backend.projectgezond.nl/api/v3/week-menus/{week}",
} as const;

export type PgEndpointKey = keyof typeof PG_ENDPOINT_DEFAULTS;
