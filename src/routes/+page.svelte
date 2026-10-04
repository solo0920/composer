<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
</script>

<div class="p-10">
	<h1 class="text-2xl font-bold">shadcn baseline</h1>
	<Button>Click me</Button>
	<Card>
		<CardHeader><CardTitle>Card</CardTitle></CardHeader>
		<CardContent>content</CardContent>
	</Card>
</div>