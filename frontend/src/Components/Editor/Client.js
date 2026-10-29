import React from "react";
import Avatar from "react-avatar";

const Client = ({ userName }) => {
	return (
		<div className="client" title={userName}>
			<Avatar name={userName || "?"} size={36} round="12px" />
			<span className="client-name">{userName}</span>
		</div>
	);
};

export default Client;
