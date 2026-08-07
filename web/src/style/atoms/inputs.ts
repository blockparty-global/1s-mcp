export const InputStyles = {
	parts: ["field", "placeholder", "element"],
	baseStyle: {
		field: {
			color: "darkBrown",
			bg: "desertSand",
			textStyle: "body2Medium",
			padding: "13px 18px",
			borderRadius: 12,
			border: "0px",
			outline: "none",
		},
	},
	variants: {
		authForm: {
			field: {
				color: "darkBrown",
				bg: "desertSand",
				textStyle: "body2Medium",
				padding: "13px 18px",
				borderRadius: 12,
				border: "1px",
				borderColor: "transparent",
				outline: "none",
				errorBorderColor:"persimmon",
				_focus: {
					outline: "none",
					ring: "1px",
					ringColor: "dataGreen.25",
				},
				_placeholder: {
					color: "darkBrown.30",
				},
				_invalid: {
					borderColor: "persimmon",
					bg: "desertSand",
				}
			},
		},
		contact : {
			field: {
				bg: "desertSand",
				color: "darkBrown",
				textStyle: "body2Medium",
			},

		},
		contactDark : {
			field: {
				bg: "darkGreen.60",
				color: "white",
				textStyle: "body2Medium",
				"&::placeholder": {
					color: "desertSand.30",
				}
			}
		}
	}
};