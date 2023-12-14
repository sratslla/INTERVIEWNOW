import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import reportWebVitals from "./reportWebVitals";
// import Home from "./pages/Home/Home";
import MorseFusion from "./pages/MorseFusion/MorseFusion";
import EditorPage from "./pages/MorseFusion/EditorPage";
// import MorseResume from "./pages/MorseResume/MorseResume";
// import MorseSync from "./pages/MorseSync/MorseSync";

const router = createBrowserRouter([
	{
		path: "/",
		element: <MorseFusion />,
	},
	{
		path: "/Editor/:roomId",
		element: <EditorPage />,
	},
]);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
	<div>
		<div>
			<Toaster
				position="top-right"
				toastOptions={{
					success: {
						theme: {
							primary: "#4aed88",
						},
					},
				}}
			></Toaster>
		</div>
		<RouterProvider router={router} />
	</div>
);
reportWebVitals();
