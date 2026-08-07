import { defineStyleConfig } from '@chakra-ui/react'

// define the base component styles
const baseStyle = {
	placement: "top",
	borderRadius: 2,
	p: 4,
	bg: "desertSand",
	color: "darkBrown.80",
	textStyle: "body1Medium",
	lineHeight: "1.5",
	whiteSpace: "nowrap",
}

const lightStyle = {
	bg: "darkBrown.80",
	color: "white",
	textStyle: "bodyXs",
	fontWeight: 400,
	lineHeight: "1.5",
	whiteSpace: "nowrap",
	borderRadius: 2,
	p: 2,
	pl: 4,
	pr: 4,
}

// export the component theme
export const tooltipTheme = defineStyleConfig({ baseStyle, variants: { light: lightStyle } })