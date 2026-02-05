/// Flutter Widgets - Convenience widgets for Autonomo integration
///
/// These widgets automatically register/unregister with the Autonomo
/// registry when mounted/disposed.

import 'package:flutter/material.dart';

import 'registry.dart';
import 'state.dart';
import 'actions.dart';

/// A button that automatically registers with Autonomo
class AutonomoButton extends StatefulWidget {
  final String id;
  final Widget child;
  final VoidCallback? onPressed;
  final bool disabled;
  final String? hint;
  final Map<String, dynamic>? meta;

  const AutonomoButton({
    super.key,
    required this.id,
    required this.child,
    this.onPressed,
    this.disabled = false,
    this.hint,
    this.meta,
  });

  @override
  State<AutonomoButton> createState() => _AutonomoButtonState();
}

class _AutonomoButtonState extends State<AutonomoButton> {
  void Function()? _unregister;

  @override
  void initState() {
    super.initState();
    _register();
  }

  @override
  void didUpdateWidget(AutonomoButton oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.id != widget.id ||
        oldWidget.disabled != widget.disabled ||
        oldWidget.hint != widget.hint) {
      _unregister?.call();
      _register();
    }
  }

  void _register() {
    _unregister = registerTapHandler(
      widget.id,
      () async => widget.onPressed?.call(),
      disabled: widget.disabled,
      hint: widget.hint,
      meta: widget.meta,
    );
  }

  @override
  void dispose() {
    _unregister?.call();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: widget.disabled ? null : widget.onPressed,
      child: widget.child,
    );
  }
}

/// A text field that automatically registers with Autonomo
class AutonomoTextField extends StatefulWidget {
  final String id;
  final TextEditingController? controller;
  final String? labelText;
  final String? hintText;
  final bool disabled;
  final String? hint;
  final Map<String, dynamic>? meta;
  final ValueChanged<String>? onChanged;
  final VoidCallback? onSubmitted;

  const AutonomoTextField({
    super.key,
    required this.id,
    this.controller,
    this.labelText,
    this.hintText,
    this.disabled = false,
    this.hint,
    this.meta,
    this.onChanged,
    this.onSubmitted,
  });

  @override
  State<AutonomoTextField> createState() => _AutonomoTextFieldState();
}

class _AutonomoTextFieldState extends State<AutonomoTextField> {
  late TextEditingController _controller;
  void Function()? _unregister;

  @override
  void initState() {
    super.initState();
    _controller = widget.controller ?? TextEditingController();
    _register();
  }

  @override
  void didUpdateWidget(AutonomoTextField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.id != widget.id ||
        oldWidget.disabled != widget.disabled ||
        oldWidget.hint != widget.hint) {
      _unregister?.call();
      _register();
    }
  }

  void _register() {
    _unregister = registerFillHandler(
      widget.id,
      (value) async {
        _controller.text = value;
        widget.onChanged?.call(value);
      },
      getValue: () => _controller.text,
      onSubmit: widget.onSubmitted != null
          ? () async => widget.onSubmitted!()
          : null,
      disabled: widget.disabled,
      hint: widget.hint,
      meta: widget.meta,
    );
  }

  @override
  void dispose() {
    _unregister?.call();
    if (widget.controller == null) {
      _controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: _controller,
      enabled: !widget.disabled,
      decoration: InputDecoration(
        labelText: widget.labelText,
        hintText: widget.hintText,
      ),
      onChanged: widget.onChanged,
      onSubmitted: (_) => widget.onSubmitted?.call(),
    );
  }
}

/// A mixin that tracks the current screen for Autonomo
mixin AutonomoScreenMixin<T extends StatefulWidget> on State<T> {
  String get screenName;

  @override
  void initState() {
    super.initState();
    state.setScreen(screenName);
  }
}

/// A widget that sets the current screen name when mounted
class AutonomoScreen extends StatefulWidget {
  final String name;
  final Widget child;

  const AutonomoScreen({
    super.key,
    required this.name,
    required this.child,
  });

  @override
  State<AutonomoScreen> createState() => _AutonomoScreenState();
}

class _AutonomoScreenState extends State<AutonomoScreen> {
  @override
  void initState() {
    super.initState();
    state.setScreen(widget.name);
  }

  @override
  void didUpdateWidget(AutonomoScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.name != widget.name) {
      state.setScreen(widget.name);
    }
  }

  @override
  Widget build(BuildContext context) {
    return widget.child;
  }
}

/// A widget that registers a custom action when mounted
class AutonomoCustomAction extends StatefulWidget {
  final String name;
  final Future<ActionResult> Function([String? value]) handler;
  final Widget child;

  const AutonomoCustomAction({
    super.key,
    required this.name,
    required this.handler,
    required this.child,
  });

  @override
  State<AutonomoCustomAction> createState() => _AutonomoCustomActionState();
}

class _AutonomoCustomActionState extends State<AutonomoCustomAction> {
  void Function()? _unregister;

  @override
  void initState() {
    super.initState();
    _unregister = registerCustomAction(widget.name, widget.handler);
  }

  @override
  void didUpdateWidget(AutonomoCustomAction oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.name != widget.name) {
      _unregister?.call();
      _unregister = registerCustomAction(widget.name, widget.handler);
    }
  }

  @override
  void dispose() {
    _unregister?.call();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return widget.child;
  }
}
