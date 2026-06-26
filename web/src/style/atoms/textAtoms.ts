
const titleStyles = {
	fontFamily: "heading",
	fontStyle: "normal",
	fontWeight: "500",
};
const bodyStyles = {
	fontFamily: "body",
	fontStyle: "normal",
};
const monoStyles = {
	fontFamily: "mono",
	fontStyle: "normal",
	textTransform: "uppercase",
};



const oneSourceTextStyles = {
	// category.level
	"headline1": {
		...bodyStyles,
		fontSize: { base: "26px", md: "36px" },
		lineHeight: "100%",
	},
	"headline1Bold": {
		...bodyStyles,
		fontSize: { base: "26px", md: "36px" },
		lineHeight: "100%",
		fontWeight: "700",
	},
	"headline2": {
		...bodyStyles,
		fontSize: { base: "24px", md: "30px" },
		lineHeight: "110%",
	},
	"headline2Bold": {
		...bodyStyles,
		fontSize: { base: "24px", md: "1.6rem" },
		lineHeight: "110%",
		fontWeight: "700",
	},
	"headline3": {
		...bodyStyles,
		fontSize: { base: "20px", md: "24px" },
		lineHeight: "110%",
	},
	"titleLg": {
		...titleStyles,
		fontSize: { base: "48px", md: "96px" },
		letterSpacing: { base: "-1.44px", md: "-2.28px" },
		lineHeight: "95%",
	},
	"titleXl": {
		...titleStyles,
		fontSize: { base: "81px" },
		letterSpacing: { base: "-3.24px" },
		lineHeight: "95%",
	},
	"titleBig": {
		...titleStyles,
		fontSize: { base: "60px", md: "120px" },
		letterSpacing: { base: "-1.8px", md: "-3.6px" },
		lineHeight: { base: "100%", md: "95%" },
	},
	"title1": {
		...titleStyles,
		fontSize: { base: "48px", md: "76px" },
		letterSpacing: { base: "-1.44px", md: "-2.28px" },
		lineHeight: "100%",
	},
	"title2": {
		...titleStyles,
		fontSize: { base: "42px", md: "76px" },
		letterSpacing: { base: "-1.26px", md: "-2.28px" },
		lineHeight: "105%",
	},
	"title3": {
		...titleStyles,
		fontSize: { base: "36px", md: "64px" },
		fontWeight: "400",
		letterSpacing: { base: "-1.08px", md: "-1.92px" },
		lineHeight: "100%",
	},
	"title4": {
		...titleStyles,
		fontSize: { base: "36px" },
		letterSpacing: { base: "-0.9px" },
		lineHeight: "100%",
		fontWeight: "400",
	},
	"title4Medium": {
		...titleStyles,
		fontSize: { base: "36px" },
		letterSpacing: { base: "-0.9px"},
		lineHeight: "100%",
		fontWeight: "500",
	},
	"body1Medium": {
		...bodyStyles,
		fontWeight: "500",
		fontSize: { base: "19px", md: "20px" },
		lineHeight: "120%",
	},
	"body1Semibold": {
		...bodyStyles,
		fontWeight: "600",
		fontSize: { base: "19px", md: "20px" },
		lineHeight: "120%",
	},
	"body2": {
		...bodyStyles,
		fontWeight: "400",
		fontSize: { base: "16px" },
		lineHeight: { base: "130%" },
	},
	"body2Medium": {
		...bodyStyles,
		fontWeight: "500",
		fontSize: { base: "16px" },
		lineHeight: { base: "130%" },
	},
	"body2Semibold": {
		...bodyStyles,
		fontWeight: "600",
		fontSize: { base: "16px" },
		lineHeight: { base: "130%" },
	},
	"body2Bold": {
		...bodyStyles,
		fontWeight: "700",
		fontSize: { base: "16px" },
		lineHeight: { base: "130%" },
	},
	"body3": {
		...bodyStyles,
		fontWeight: "400",
		fontSize: { base: "15px" },
		lineHeight: { base: "120%" },
		letterSpacing: "0.15px",
	},
	"body3Medium": {
		...bodyStyles,
		fontWeight: "500",
		fontSize: { base: "15px" },
		lineHeight: { base: "120%" },
		letterSpacing: "0.15px",
	},
	"body3Semibold": {
		...bodyStyles,
		fontWeight: "600",
		fontSize: { base: "15px" },
		lineHeight: { base: "150%" },
	},
	"body4": {
		...bodyStyles,
		fontWeight: "400",
		fontSize: { base: "14px" },
		lineHeight: { base: "120%" },
		letterSpacing: "0.15px",
	},
	"body4Medium": {
		...bodyStyles,
		fontWeight: "500",
		fontSize: { base: "14px" },
		lineHeight: { base: "120%" },
		letterSpacing: "0.15px",
	},
	"body4Semibold": {
		...bodyStyles,
		fontWeight: "600",
		fontSize: { base: "14px" },
		lineHeight: { base: "150%" },
	},
	"bodyXs": {
		...bodyStyles,
		fontWeight: "400",
		fontSize: { base: "12px" },
		lineHeight: { base: "150%", md: "120%" },
	},
	"bodyXsMedium": {
		...bodyStyles,
		fontWeight: "500",
		fontSize: { base: "12px" },
		lineHeight: { base: "150%", md: "120%" },
	},
	"mono1Medium": {
		...monoStyles,
		fontSize: "12px",
		fontWeight: "500",
		lineHeight: "120%",
		letterSpacing: { base: "0.24px", md: "0.36px" },
      
	},
	"mono1Semibold": {
		...monoStyles,
		fontSize: "12px",
		fontWeight: "600",
		lineHeight: "120%",
		letterSpacing: { base: "0.4px" },
      
	},
	"mono2Medium": {
		...monoStyles,
		fontSize: "14px",
		fontWeight: "500",
		lineHeight: "100%",
		letterSpacing: "0.28px",
		textEdge: "cap",
		leadingTrim: "both",
      
	},
	"mono2Semibold": {
		...monoStyles,
		fontSize: "14px",
		fontWeight: "500",
		lineHeight: "100%",
		letterSpacing: "0.28px",
      
	},
	"mono3": {
		...monoStyles,
		fontSize: "16px",
		fontWeight: "400",
		lineHeight: "normal",
		letterSpacing: "0.32px",
	},
	"mono3Medium": {
		...monoStyles,
		fontSize: "16px",
		fontWeight: "500",
		lineHeight: "120%",
		letterSpacing: "0.32px",
      
	},
	"mono3Semibold": {
		...monoStyles,
		fontSize: "16px",
		fontWeight: "600",
		lineHeight: "120%",
		letterSpacing: "0.32px",
      
	},
};

const textStyles = {
	strong: {
	  fontWeight: "bold",
	},
	...oneSourceTextStyles,
  };

export default textStyles;
