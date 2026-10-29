export const language_options = [
	{ id: 63, name: "javascript", label: "JavaScript", mode: "javascript" },
	{ id: 60, name: "go", label: "Go", mode: "go" },
	{ id: 71, name: "python", label: "Python", mode: "python" },
	{ id: 54, name: "cpp", label: "C++", mode: "text/x-c++src" },
	{ id: 62, name: "java", label: "Java", mode: "text/x-java" },
];

export const dropDownOptions = language_options.map((lang) => ({
	value: lang.id,
	label: lang.label,
	mode: lang.mode,
	name: lang.name,
}));
