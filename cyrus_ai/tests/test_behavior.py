from cyrus_ai.core.behavior import BehaviorRouter


def test_behavior_router_modes():
    router = BehaviorRouter()

    assert router.detect_mode("explain for a kid").mode == "kids"
    assert router.detect_mode("legal contract review").mode == "professional"
    assert router.detect_mode("let us debate this argument").mode == "debate"
    assert router.detect_mode("check status now").mode == "ops"
    assert router.detect_mode("Launch drone for reconnaissance mission").mode == "ops"
