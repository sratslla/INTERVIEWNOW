import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import reportWebVitals from "./reportWebVitals";
import Home from "./pages/Home";
import EditorPage from "./pages/EditorPage";
import { Analytics } from "@vercel/analytics/react";

const router = createBrowserRouter([
	{
		path: "/",
		element: <Home />,
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
		<Analytics />
		<RouterProvider router={router} />
	</div>
);
reportWebVitals();
