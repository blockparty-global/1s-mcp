import { tableAnatomy } from "@chakra-ui/anatomy";
import { createMultiStyleConfigHelpers } from "@chakra-ui/react";

const { definePartsStyle, defineMultiStyleConfig } =
  createMultiStyleConfigHelpers(tableAnatomy.keys)

export const baseStyle = definePartsStyle({
		table: {
			borderColor: "dataGreen",
			color: "white",
		},
		th: {
			color: "dataGreen",
		  	textStyle: "body3Medium",
			textTransform: "none",
		},
		tr: {
				color: "white",
				textTransform: "none",
		}
});

export const variantDashboardLight = definePartsStyle({
	table: {
		backgroundColor: "white",
		boxShadow: "0 0 4px 0 rgba(0, 0, 0, 0.15);",
		borderRadius: 2,
		borderColor: "darkBrown.80",
		color: "darkBrown.80",
		th: {
			color: "darkBrown.80",
			textTransform: "none",
			paddingTop: 6,
			paddingBottom: 6,
			fontFamily: "body",
			fontWeight: 500,
			fontSize: "16px",
		},
		tr: {
			color: "darkBrown.80",
			borderBottom: "1px solid",
			borderColor: "almondCream",
			height: 8,
			paddingTop: 6,
			paddingBottom: 6,
			textAlign: "left",
			justifyContent: "flex-start",
		}
	}
});

  export const tableTheme = defineMultiStyleConfig({
	baseStyle,
	variants: {
		dashboardLight: variantDashboardLight,
	},
  });