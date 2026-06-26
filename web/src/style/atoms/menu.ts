import { menuAnatomy } from '@chakra-ui/anatomy'
import { createMultiStyleConfigHelpers } from '@chakra-ui/react'

const { definePartsStyle, defineMultiStyleConfig } =
  createMultiStyleConfigHelpers(menuAnatomy.keys)

const baseStyle = definePartsStyle({
  button: {
    // this will style the MenuButton component
  },
  list: {
    // this will style the MenuList component
	border: 'none',
	shadow: "none",
	p: 0,
	m: 0,
	w: "218px",
	outline: "none",
	minW: "unset"
  },
  item: {
    // this will style the MenuItem and MenuItemOption components
	w: "100%",
	h: "42px",
	px : 6,
	py : 2,
	bg: "white",
	cursor: "pointer",
	color: "darkBrown",
	border: "none",
	leadingTrim: "both",
	textEdge: "cap",
	fontFamily: "Figtree",
	fontSize: "14.22px",
	fontStyle: "normal",
	fontWeight: 400,
	lineHeight: "normal",
	transition: "background-color 0.3s ease",
	_hover: {
		bg: "almondCream",
		color: "darkBrown",
	},
	_active: {
		bg: "almondCream",
		color: "darkBrown",
	},
  },
  groupTitle: {
    // this will style the text defined by the title prop
    // in the MenuGroup and MenuOptionGroup components
  },
  command: {
    // this will style the text defined by the command
    // prop in the MenuItem and MenuItemOption components
  },
  divider: {
    // this will style the MenuDivider component
  },
})

export const menuTheme = defineMultiStyleConfig({ baseStyle })