const activeRadio = {
  bg: "darkBrown.80",
  borderColor: "darkBrown.80",
};

const RadioStyles = {
  baseStyle: {
    control: {
      borderColor: "darkBrown.80",
      _checked: {
        ...activeRadio,
        _hover: activeRadio,
        _before: {
          bg: "white",
        },
      },
      _hover: {
        borderColor: "darkBrown.80",
      },
      _focus: {
        boxShadow: "none",
      },
    },
  },
};

export default RadioStyles;
