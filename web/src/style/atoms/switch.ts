// The default Chakra Switch uses colorScheme "blue", which resolves the checked
// track to `blue.500`. Our design tokens only define `blue` as a single value
// (no numeric scale), so `blue.500` fails to resolve and the track renders with
// no fill — making the enable/disable toggle nearly invisible against the light
// dashboard background. Style the track explicitly with brand tokens instead.
// Checked uses the brand's signal-green (dataGreen) to read clearly as "on";
// the unchecked track stays visibly filled so the control reads as a control.
const SwitchStyles = {
	baseStyle: {
		track: {
			bg: "darkBrown.30",
			_checked: {
				bg: "dataGreen",
			},
		},
	},
};

export default SwitchStyles;
