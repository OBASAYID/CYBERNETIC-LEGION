from cyrus_ai.services.mission_bus import MissionBus


def test_mission_bus_executes_ops_command():
    bus = MissionBus()
    result = bus.execute("check drone mission status")
    assert result.handled is True
    assert result.status == "ok"
    assert "Drone mission bus" in result.output or "status" in result.output.lower()
