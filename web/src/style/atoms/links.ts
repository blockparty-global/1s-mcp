export const LinkStyles = {
	baseStyle: {
		color: "midnightGreen",
		textStyle: "body2Medium",
		padding: "13px 18px",       
	},
	variants: {
		button : {
			border: "1px solid",
			borderColor: "darkGreen.30",
			borderRadius: "40px",
			padding: "8px 16px",
			textStyle: "body2Medium",
			color: "darkGreen",
			transition: "all 0.2s ease-in-out",
			_hover: {
				textDecoration: "none",
				borderColor: "darkGreen",
			}
		},
		buttonPrimary : {
			bg: "dataGreen",
			borderRadius: "40px",
			padding: "13px 16px",
			textStyle: "body2Medium",
			color: "darkGreen",
			transition: "all 0.2s ease-in-out",
			_hover: {
				textDecoration: "none",
				bg: "dataGreenBright"
			}
		},
		unstyled: {
			color: "inherit",
			textStyle: "inherit",
			padding: 0,
			_hover: {
				textDecoration: "none",
			}
		}
	}
};