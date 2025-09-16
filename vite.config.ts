import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react()],
	// Because we're deployed at: ccorcos.github.io/geocalc/
	base: "/geocalc/",
})
