import React from "react";
import Avatar from "react-avatar";

const Client = ({ userName }) => {
	return (
		<div className="client">
			<Avatar
				name={userName}
				size={40}
				round="14px"
				style={{ padding: "5px" }}
			/>
		</div>
	);
};

export default Client;
