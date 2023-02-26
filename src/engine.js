var oldTick;
var fpsInterval = 1000 / 60;

function engineInit()
{
	oldTick = Date.now();
	
	initGL();
	engineAppInit();
}

function engineUpdate()
{
	engineAppUpdate();
	renderGL();
}

function engineUpdateLoop()
{
	var tick = Date.now();
	var elapsed = tick - oldTick;
	if (elapsed > fpsInterval) {
		engineUpdate();
		oldTick = tick - (elapsed % fpsInterval);
	}
	window.requestAnimationFrame(engineUpdateLoop);
}

function engineRun()
{
	engineInit();
	engineUpdateLoop();
}
