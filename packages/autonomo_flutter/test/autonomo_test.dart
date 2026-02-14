import 'package:autonomo_flutter/autonomo_flutter.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  setUp(() {
    registry.clear();
    customActions.clear();
    state.clearErrors();
    state.setData({});
    state.setScreen('unknown');
  });

  group('Registry', () {
    test('starts empty', () {
      expect(registry.list(), isEmpty);
    });

    test('registerTapHandler registers and unregisters', () async {
      var tapped = false;
      final unregister = registerTapHandler('Test.Button', () async {
        tapped = true;
      });

      expect(registry.has('Test.Button'), isTrue);
      await registry.get('Test.Button')!.handler();
      expect(tapped, isTrue);

      unregister();
      expect(registry.has('Test.Button'), isFalse);
    });

    test('registerFillHandler handles value', () async {
      var value = '';
      final unregister = registerFillHandler(
        'Test.Input',
        (v) async {
          value = v;
        },
        getValue: () => value,
      );

      await registry.get('Test.Input')!.handler('hello');
      expect(value, equals('hello'));
      expect(registry.get('Test.Input')!.getValue!(), equals('hello'));
      unregister();
    });
  });

  group('CustomActions', () {
    test('executes action', () async {
      final unregister = registerCustomAction('testAction', ([value]) async {
        return ActionResult.ok('Got: $value');
      });

      final result = await customActions.execute('testAction', 'hello');
      expect(result.success, isTrue);
      expect(result.message, contains('Got: hello'));
      unregister();
    });

    test('returns error for unknown action', () async {
      final result = await customActions.execute('missing');
      expect(result.success, isFalse);
      expect(result.error?.toLowerCase(), contains('unknown'));
    });
  });

  group('State', () {
    test('tracks screen and user', () {
      state.setScreen('login');
      state.setUser(const UserContext(id: '1', email: 'a@b.com', role: 'admin'));
      final snapshot = state.getState();
      expect(snapshot.screen, equals('login'));
      expect(snapshot.user?.email, equals('a@b.com'));
    });
  });

  group('Commands', () {
    test('press works', () async {
      var pressed = false;
      registerTapHandler('Cmd.Button', () async {
        pressed = true;
      });
      final result = await executeCommand('press', 'Cmd.Button');
      expect(result.success, isTrue);
      expect(pressed, isTrue);
    });

    test('fill works', () async {
      var value = '';
      registerFillHandler('Cmd.Input', (v) async {
        value = v;
      });
      final result = await executeCommand('fill', 'Cmd.Input', 'hello');
      expect(result.success, isTrue);
      expect(value, equals('hello'));
    });

    test('wait works', () async {
      final result = await executeCommand('wait', '50');
      expect(result.success, isTrue);
    });

    test('custom command works', () async {
      registerCustomAction('myAction', ([value]) async => ActionResult.ok('ok $value'));
      final result = await executeCommand('custom', 'myAction', 'x');
      expect(result.success, isTrue);
    });
  });
}
