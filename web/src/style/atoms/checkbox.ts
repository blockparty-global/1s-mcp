const activeCheckbox = {
	bg: "white",
	borderColor: "darkBrown.80",
  };
  
  const CheckboxStyles = {
	baseStyle: {
	  icon: {
		color: "darkBrown.80",
		borderColor: "darkBrown.80",
	  },
	  control: {
		borderRadius: 1,
		borderWidth: 1,
		borderColor: "darkBrown.80",
		bg: "white",
		_checked: {
		  ...activeCheckbox,
		  _hover: activeCheckbox,
		},
		_focus: activeCheckbox,
		_hover: activeCheckbox,
	  },
	},
  };

  export default CheckboxStyles;