import { extendTheme } from "@chakra-ui/react";
import { InputStyles } from "./atoms/inputs";
import { ButtonStyles } from "./atoms/buttons";
import CheckboxStyles from "./atoms/checkbox";
import RadioStyles from "./atoms/radio";
import SwitchStyles from "./atoms/switch";
import { tableTheme } from "./atoms/table";
import layerStyles from "./atoms/layerStyles";
import textStyles from "./atoms/textAtoms";
import { menuTheme } from "./atoms/menu";
import { tooltipTheme } from "./atoms/tooltip";

import designTokens from "../design-tokens.json";

const getToken = (path: string): any => {
  const keys = path.split(".");
  let value: any = designTokens.tokens;
  for (const key of keys) {
    value = value[key];
  }
  return value;
};

const colors = {
  ...getToken("colors"),
  warmSandstone: "#D9BFAB",
};

const fonts = {
  heading: getToken("typography.fonts.stacks.heading"),
  body: getToken("typography.fonts.stacks.body"),
  mono: getToken("typography.fonts.stacks.mono"),
};

const fontSizes = getToken("typography.fontSizes");
const fontWeights = getToken("typography.fontWeights");
const borders = getToken("borders");
const space = getToken("space");

const shadows = {
  ...getToken("shadows"),
  dashboardLight: "0 0 4px 0 rgba(0, 0, 0, 0.15);",
  dashboardLightMenu: "0 0 8px 0 rgba(0, 0, 0, 0.10)",
};

const transitions = getToken("transitions");

const theme = extendTheme({
  colors,
  fonts,
  borders,
  fontWeights,
  fontSizes,
  space,
  radii: space,
  shadows,
  transitions,
  components: {
    Button: ButtonStyles,
    Table: tableTheme,
    Checkbox: CheckboxStyles,
    Radio: RadioStyles,
    Switch: SwitchStyles,
    Input: InputStyles,
    Menu: menuTheme,
    Tooltip: tooltipTheme,
  },
  layerStyle: layerStyles,
  textStyles,
});

export default theme;
