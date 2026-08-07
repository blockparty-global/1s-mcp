export const ButtonStyles = {
	baseStyle: {
		color: "midnightGreen",
		textStyle: "body2Medium",
		transition: "background-color 0.2s ease-in-out",
		px: 4,
		py: 2,
		borderRadius: "99px",
		_disabled: {
			opacity: 1,
		},
	},
	variants: {
		 outline: {
			border: "1px solid",
			borderColor: "dataGreen.25",
			color: "dataGreen",
		},
		outlineLight: {
			border: "1px solid",
			borderColor: "darkBrown.80",
			color: "darkBrown.80",
			borderRadius: 2,
			py: 2,
			px: 4,
			fontSize: "14px",
			fontWeight: 400,
			_disabled: {
				backgroundColor: "desertSand",
				borderColor: "transparent",
			},
		},
		outlineLightIcon: {
			border: "none",
			borderRadius: 0,
			borderColor: "transparent",
			color: "warmSandstone",
			p: 0,
			m: 0,
			h: 6,
			minW: "unset",
			fontSize: "24px",
			icon: {
				h: 6,
				aspectRatio: "7/8",
			},

			_hover: {
				backgroundColor: "desertSand",
				color: "darkBrown.80",
			},
		},
		solid: {
			backgroundColor: "dataGreen",
			color: "black",
			px: 12,
			py: 6,
			rounded: "sm",
			fontSize: "17px",
			fontWeight: 500,
			_focus: {
				outline: "none",
				ring: 2,
				ringOffset: 2,
				ringColor: "black",
				bg: "dataGreenBright",
			},
			_hover: { bg: "dataGreenBright" },
			_active: { bg: "dataGreenBright" },
			_disabled: {
				bg: "dataGreen.25",
				opacity: 1,
			},
			_error: {
				bg: "persimmon",
				opacity: 1,
			},
		},
		primary: {
			bg: "dataGreen",
			color: "darkGreen",
			borderRadius: "99px",
			border: "none",
			outline: "none",
			textStyle: "body2Medium",
			transition: "background-color 0.2s ease-in-out",
			_hover: {
				bg: "dataGreenBright",
			},
		}
	},
};